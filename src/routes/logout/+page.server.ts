import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	// Clear auth
	locals.pb.authStore.clear();
	locals.user = null;

	// Clear cookies
	cookies.delete('pb_auth', { path: '/' });

	// Redirect to login
	throw redirect(303, '/login');
};
