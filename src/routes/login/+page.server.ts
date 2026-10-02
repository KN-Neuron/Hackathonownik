import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SecureCookieHandler } from '$lib/server/secure-cookie';
import type { ClientResponseError } from 'pocketbase';
import { isAdmin } from '$lib/server/access';

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
	default: async ({ locals, request, url, cookies }) => {
		const form = Object.fromEntries(await request.formData()) as {
			email: string;
			password: string;
		};

		try {
			await locals.pb.collection('users').authWithPassword(form.email, form.password);

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
