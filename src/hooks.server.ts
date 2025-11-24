import 'dotenv/config';
import PocketBase from 'pocketbase';
import { type Handle, redirect } from '@sveltejs/kit';
import type { TypedPocketBase } from '$lib/types';
import { Security, CSRFProtection, SECURITY_HEADERS, rateLimiters } from '$lib/server/security';
import { SecureCookieHandler } from '$lib/server/secure-cookie';

// ============================================
// ROUTE ACCESS CONTROL
// ============================================

async function areAllTeamsRated(pb: TypedPocketBase): Promise<boolean> {
	let presentations;
	try {
		presentations = await pb.collection('presentations').getFullList();
	} catch (e) {
		throw new Error('Failed to fetch presentations list', { cause: e });
	}

	if (presentations.length === 0) return false;

	let ratings;
	try {
		ratings = await pb.collection('ratings').getFullList();
	} catch (e) {
		throw new Error('Failed to fetch ratings list', { cause: e });
	}

	if (ratings.length === 0) return false;

	const presentationIds = presentations.map((p) => p.id);
	const ratedPresentationIds = new Set(ratings.map((r) => r.presentation));

	return presentationIds.every((id) => ratedPresentationIds.has(id));
}

async function checkRouteAccess(
	pathname: string,
	user: any,
	pb: TypedPocketBase
): Promise<boolean> {
	const publicRoutes = ['/login', '/'];
	if (publicRoutes.includes(pathname)) {
		return true;
	}

	if (!user) {
		return false;
	}

	if (user.admin || user.role === 'admin') {
		return true;
	}

	if (user.role === 'participant' || user.team) {
		if (pathname === '/upload' || pathname.startsWith('/upload/')) {
			return true;
		}

		if (pathname === '/presentations' || pathname.startsWith('/presentations/')) {
			// Participants can see presentations after all teams are rated
			const allRated = await areAllTeamsRated(pb);
			return allRated;
		}

		if (pathname === '/ranking' || pathname.startsWith('/ranking/')) {
			// Participants can see rankings after all teams are rated
			const allRated = await areAllTeamsRated(pb);
			return allRated;
		}

		return false;
	}

	if (user.role === 'jury') {
		// Juries can always view presentations, rate, and see rankings
		const juryAllowedRoutes = ['/presentations', '/rate_presentation', '/ranking'];
		const isAllowed = juryAllowedRoutes.some(
			(route) => pathname === route || pathname.startsWith(route + '/')
		);
		return isAllowed;
	}

	return false;
}

// ============================================
// MAIN HANDLE
// ============================================

export const handle: Handle = async ({ event, resolve }) => {
	const pb = new PocketBase('https://hotb-pb.knneuron.pl/') as TypedPocketBase;

	// Try to load session using our secure cookie first
	const secureSession = SecureCookieHandler.getSessionFromCookie(event);
	if (secureSession) {
		// Load the session data into PocketBase
		pb.authStore.save(secureSession.token, secureSession.model);
	} else {
		// Fallback to loading from standard cookie (for transition)
		pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');
	}

	event.locals.pb = pb;
	event.locals.user = pb.authStore.isValid ? pb.authStore.record : null;

	const pathname = event.url.pathname;

	// Skip access control for static files and API routes
	const skipAccessControl =
		pathname.startsWith('/_app') ||
		pathname.startsWith('/api/') ||
		pathname.includes('.') ||
		pathname.startsWith('/paraglide-demo');

	if (!skipAccessControl) {
		const hasAccess = await checkRouteAccess(pathname, event.locals.user, pb);

		if (!hasAccess) {
			if (!event.locals.user) {
				if (pathname !== '/login') {
					throw redirect(303, `/login?redirect=${encodeURIComponent(pathname)}`);
				}
			} else {
				if (event.locals.user.admin || event.locals.user.role === 'admin') {
					throw redirect(303, '/admin/dashboard');
				} else if (event.locals.user.role === 'jury') {
					throw redirect(303, '/rate_presentation');
				} else if (event.locals.user.role === 'participant' || event.locals.user.team) {
					throw redirect(303, '/upload');
				}
				throw redirect(303, '/');
			}
		}
	}

	// Rate Limiting
	const clientIp = event.getClientAddress();
	const rateLimitKey = event.locals.user?.id ? `user:${event.locals.user.id}` : `ip:${clientIp}`;

	// In development mode, use more permissive limits
	const isDev = process.env.NODE_ENV === 'development';

	// General rate limit: 2000 requests per minute (very high for dev)
	const requestsPerMinute = isDev ? 5000 : 2000; // More permissive in development
	const generalLimit = rateLimiters.general.check(rateLimitKey, requestsPerMinute, 60 * 1000);

	// if (!generalLimit.allowed) {
	// 	const retryAfter = Math.ceil((generalLimit.resetTime - Date.now()) / 1000);
	// 	return new Response(JSON.stringify({ error: 'Too many requests', retryAfter }), {
	// 		status: 429,
	// 		headers: {
	// 			'Content-Type': 'application/json',
	// 			'Retry-After': retryAfter.toString()
	// 		}
	// 	});
	// }

	// CSRF Protection
	// CRITICAL: Always get token from cookie and set in locals
	let token = CSRFProtection.getToken(event);

	if (event.request.method === 'GET') {
		if (!token) {
			token = CSRFProtection.setToken(event);
		}
	}

	// Set token in locals for ALL requests (GET and POST)
	event.locals.csrfToken = token;

	/* Auth rate limiting: 10 attempts per 5 minutes, 10 minute lockout
	if (pathname.includes('/login') || pathname.includes('/register')) {
		const maxAttempts = isDev ? 100 : 10; // More permissive in development
		const authLimit = rateLimiters.auth.check(
			rateLimitKey,
			maxAttempts,
			5 * 60 * 1000,
			10 * 60 * 1000
		);

		if (!authLimit.allowed) {
			const retryAfter = Math.ceil((authLimit.resetTime - Date.now()) / 1000);
			return new Response(
				JSON.stringify({ error: 'Too many authentication attempts', retryAfter }),
				{
					status: 429,
					headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter.toString() }
				}
			);
		}
	}
	*/

	// Upload rate limiting: 50 uploads per 5 minutes
	if (pathname.includes('/upload')) {
		const maxUploads = isDev ? 100 : 50; // More permissive in development
		const uploadLimit = rateLimiters.upload.check(rateLimitKey, maxUploads, 5 * 60 * 1000);

		// if (!uploadLimit.allowed) {
		// 	const retryAfter = Math.ceil((uploadLimit.resetTime - Date.now()) / 1000);
		// 	return new Response(JSON.stringify({ error: 'Too many upload attempts', retryAfter }), {
		// 		status: 429,
		// 		headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter.toString() }
		// 	});
		// }
	}

	event.locals.security = new Security(event);

	// Set session cookie BEFORE resolving if auth is valid
	// This must happen before resolve() to avoid "Cannot use cookies.set() after response generated" error
	if (pb.authStore.isValid) {
		SecureCookieHandler.setSessionCookie(
			event,
			{
				token: pb.authStore.token,
				model: pb.authStore.record
			},
			60 * 60 * 24 * 7 // 7 days
		);
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return (
				name.startsWith('x-') ||
				name === 'content-security-policy' ||
				name === 'strict-transport-security' ||
				name === 'referrer-policy' ||
				name === 'permissions-policy'
			);
		}
	});

	Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	response.headers.set('X-RateLimit-Limit', '1000');
	response.headers.set('X-RateLimit-Remaining', generalLimit.remaining.toString());
	response.headers.set('X-RateLimit-Reset', new Date(generalLimit.resetTime).toISOString());

	return response;
};

export const handleError = ({ error, event }) => {
	// Always log the error for debugging purposes (in both dev and prod)
	const errorLog = {
		timestamp: new Date().toISOString(),
		url: event?.url?.toString(),
		method: event?.request?.method,
		error: error?.message,
		stack: error?.stack,
		cause: error?.cause
	};

	console.error('Server Error:', JSON.stringify(errorLog, null, 2));

	// In production, don't expose internal error messages to the client for security
	const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV; // Default to dev-like behavior if NODE_ENV is not set

	// For security, return generic error message to client
	return {
		message: isDev ? error?.message || 'An error occurred' : 'An error occurred',
		code: error?.code ?? 'UNKNOWN'
	};
};
