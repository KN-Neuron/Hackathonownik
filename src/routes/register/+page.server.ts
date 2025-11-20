import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SecureCookieHandler } from '$lib/server/secure-cookie';
import type { ClientResponseError } from 'pocketbase';

export const load: PageServerLoad = async ({ locals }) => {
	locals.user && redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals, request, cookies }) => {
		const form = Object.fromEntries(await request.formData()) as {
			email: string;
			password: string;
			passwordConfirm: string;
		};

		const user = {
			email: form.email,
			password: form.password,
			passwordConfirm: form.passwordConfirm
		};

		try {
			if (user.email && user.password) {
				// Create the user
				await locals.pb.collection('users').create(user);

				// Authenticate the new user
				await locals.pb.collection('users').authWithPassword(user.email, user.password);

				// Set the secure session cookie
				SecureCookieHandler.setSessionCookie(
					{ cookies } as any,
					{
						token: locals.pb.authStore.token,
						model: locals.pb.authStore.record
					},
					60 * 60 * 24 * 7 // 7 days
				);
			}
		} catch (err: unknown) {
			const error = err as ClientResponseError;
			console.error('Registration error:', error);
			return fail(400, {
				error: error.message || 'Failed to create account'
			});
		}

		throw redirect(303, '/');
	}
};
