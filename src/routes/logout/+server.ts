import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SecureCookieHandler } from '$lib/server/secure-cookie';

export const GET: RequestHandler = async ({ locals, ...event }) => {
	// Clear auth
	locals.pb.authStore.clear();
	locals.user = null;

	// Clear secure session cookie
	SecureCookieHandler.clearSessionCookie(event as any);

	// Also clear legacy pb_auth cookie for backward compatibility
	event.cookies.delete('pb_auth', { path: '/' });

	// Redirect to login
	throw redirect(303, '/login');
};