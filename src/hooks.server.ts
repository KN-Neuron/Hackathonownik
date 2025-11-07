import PocketBase from 'pocketbase';
import { type Handle, redirect } from '@sveltejs/kit';
import type { TypedPocketBase } from '$lib/types';
import { Security, CSRFProtection, SECURITY_HEADERS, rateLimiters } from '$lib/server/security';

// ============================================
// ROUTE ACCESS CONTROL
// ============================================

async function areAllTeamsRated(pb: TypedPocketBase): Promise<boolean> {
	try {
		const presentations = await pb.collection('presentations').getFullList();
		if (presentations.length === 0) return false;

		const ratings = await pb.collection('ratings').getFullList();
		if (ratings.length === 0) return false;

		const presentationIds = presentations.map((p) => p.id);
		const ratedPresentationIds = new Set(ratings.map((r) => r.presentation));

		return presentationIds.every((id) => ratedPresentationIds.has(id));
	} catch (e) {
		console.error('Error checking if all teams rated:', e);
		return false;
	}
}

async function checkRouteAccess(
	pathname: string,
	user: any,
	pb: TypedPocketBase
): Promise<boolean> {
	const publicRoutes = ['/login', '/register', '/', '/logout'];
	if (publicRoutes.includes(pathname)) {
		return true;
	}

	if (!user) {
		return false;
	}

	if (user.admin) {
		return true;
	}

	if (user.role === 'participant' || user.team) {
		if (pathname === '/upload' || pathname.startsWith('/upload/')) {
			return true;
		}

		if (pathname === '/ranking' || pathname.startsWith('/ranking/')) {
			const allRated = await areAllTeamsRated(pb);
			return allRated;
		}

		return false;
	}

	if (user.role === 'jury') {
		const juryAllowedRoutes = ['/rate_presentation', '/ranking'];
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
	const pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase;
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

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
				if (event.locals.user.admin) {
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

	// General rate limit: 1000 requests per minute (very high for dev)
	const generalLimit = rateLimiters.general.check(rateLimitKey, 1000, 60 * 1000);

	if (!generalLimit.allowed) {
		const retryAfter = Math.ceil((generalLimit.resetTime - Date.now()) / 1000);
		return new Response(JSON.stringify({ error: 'Too many requests', retryAfter }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': retryAfter.toString()
			}
		});
	}

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

	// Auth rate limiting: 10 attempts per 5 minutes, 10 minute lockout
	if (pathname.includes('/login') || pathname.includes('/register')) {
		const authLimit = rateLimiters.auth.check(rateLimitKey, 10, 5 * 60 * 1000, 10 * 60 * 1000);

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

	// Upload rate limiting: 50 uploads per 5 minutes (much more permissive for dev)
	if (pathname.includes('/upload')) {
		const uploadLimit = rateLimiters.upload.check(rateLimitKey, 50, 5 * 60 * 1000);

		if (!uploadLimit.allowed) {
			const retryAfter = Math.ceil((uploadLimit.resetTime - Date.now()) / 1000);
			return new Response(JSON.stringify({ error: 'Too many upload attempts', retryAfter }), {
				status: 429,
				headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter.toString() }
			});
		}
	}

	event.locals.security = new Security(event);

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

	if (pb.authStore.isValid) {
		response.headers.append(
			'set-cookie',
			pb.authStore.exportToCookie({
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7
			})
		);
	}

	response.headers.set('X-RateLimit-Limit', '1000');
	response.headers.set('X-RateLimit-Remaining', generalLimit.remaining.toString());
	response.headers.set('X-RateLimit-Reset', new Date(generalLimit.resetTime).toISOString());

	return response;
};

export const handleError = ({ error, event }) => {
	const isDev = process.env.NODE_ENV === 'development';
	if (isDev) {
		console.error('Error:', error);
	}
	return {
		message: 'An error occurred',
		code: error?.code ?? 'UNKNOWN'
	};
};
