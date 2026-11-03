import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SecureCookieHandler } from '$lib/server/secure-cookie';
import type { ClientResponseError } from 'pocketbase';
import { isAdmin } from '$lib/server/access';
import { AttemptLimiter } from '$lib/server/adminUnlock';

// Wrong passwords: one account is locked after 10 tries for 10 minutes; one address after 200
// (high, because the whole venue may share a single address)
const accountLimiter = new AttemptLimiter(10, 10 * 60_000);
const addressLimiter = new AttemptLimiter(200, 10 * 60_000);

// Where each role starts after logging in
function homeFor(user: { admin?: boolean; role?: string } | null): string {
	if (isAdmin(user)) return '/admin/dashboard';
	if (user?.role === 'jury') return '/rate_presentation';
	return '/my-submission';
}

export const load: PageServerLoad = async ({ locals }) => {
	locals.user && redirect(303, '/');
};

export const actions = {
	default: async ({ locals, request, url, cookies, getClientAddress }) => {
		const form = Object.fromEntries(await request.formData()) as {
			email: string;
			password: string;
		};

		const account = `account:${String(form.email ?? '')
			.trim()
			.toLowerCase()}`;
		let address = 'unknown';
		try {
			address = `ip:${getClientAddress()}`;
		} catch {
			// no client address available
		}
		const lockedMs = Math.max(accountLimiter.lockedFor(account), addressLimiter.lockedFor(address));
		if (lockedMs > 0) {
			return fail(429, {
				error: `Too many wrong passwords. Try again in ${Math.ceil(lockedMs / 60_000)} min.`
			});
		}

		try {
			await locals.pb.collection('users').authWithPassword(form.email, form.password);
			accountLimiter.succeed(account);

			// Set the secure session cookie
			SecureCookieHandler.setSessionCookie(
				{ cookies } as any,
				{
					token: locals.pb.authStore.token,
					model: locals.pb.authStore.record
				},
				60 * 60 * 24 * 7 // 7 days
			);
		} catch (e) {
			// Handle authentication errors
			const err = e as ClientResponseError;
			accountLimiter.fail(account);
			addressLimiter.fail(address);
			console.error('Login error:', err);
			return fail(400, {
				error: err.message || 'Invalid email or password'
			});
		}

		// Only follow local paths, so a crafted link can't send users to another site
		const requested = url.searchParams.get('redirect');
		const isLocalPath =
			requested?.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\');
		throw redirect(
			303,
			isLocalPath
				? requested!
				: homeFor(locals.pb.authStore.record as { admin?: boolean; role?: string } | null)
		);
	}
} satisfies Actions;
