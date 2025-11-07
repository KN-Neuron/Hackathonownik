import PocketBase from 'pocketbase';
import { type Handle, redirect } from '@sveltejs/kit';
import type { TypedPocketBase } from '$lib/types';
import { Security, CSRFProtection, SECURITY_HEADERS, rateLimiters } from '$lib/server/security';

// ============================================
// ROUTE ACCESS CONTROL
// ============================================

/**
 * Check if all teams have been rated (for participant ranking access)
 */
async function areAllTeamsRated(pb: TypedPocketBase): Promise<boolean> {
	try {
		// Get all teams with presentations
		const presentations = await pb.collection('presentations').getFullList();
		if (presentations.length === 0) return false;

		// Get all ratings
		const ratings = await pb.collection('ratings').getFullList();
		if (ratings.length === 0) return false;

		// Get unique jury members
		const juryMembers = await pb.collection('users').getFullList({
			filter: 'role = "jury"'
		});

		// Check if each presentation has been rated by at least one jury member
		// (or adjust logic based on your requirements)
		const presentationIds = presentations.map((p) => p.id);
		const ratedPresentationIds = new Set(ratings.map((r) => r.presentation));

		// All presentations should have at least one rating
		return presentationIds.every((id) => ratedPresentationIds.has(id));
	} catch (e) {
		console.error('Error checking if all teams rated:', e);
		return false;
	}
}

/**
 * Route access control based on user role
 */
async function checkRouteAccess(
	pathname: string,
	user: any,
	pb: TypedPocketBase
): Promise<boolean> {
	// Public routes - everyone can access
	const publicRoutes = ['/login', '/register', '/', '/logout'];
	if (publicRoutes.includes(pathname)) {
		return true;
	}

	// Not logged in - redirect to login
	if (!user) {
		return false;
	}

	// Admin can access everything
	if (user.admin) {
		return true;
	}

	// Participant routes
	if (user.role === 'participant' || user.team) {
		const participantAllowedRoutes = ['/upload', '/', '/main'];

		// Check if route is in allowed list
		const isAllowed = participantAllowedRoutes.some(
			(route) => pathname === route || pathname.startsWith(route + '/')
		);

		// Special case: rankings - only if all teams are rated
		if (pathname === '/rankings' || pathname.startsWith('/rankings/')) {
			const allRated = await areAllTeamsRated(pb);
			return allRated;
		}

		return isAllowed;
	}

	// Jury routes
	if (user.role === 'jury') {
		const juryAllowedRoutes = ['/', '/main', '/rankings', '/jury', '/rate'];

		const isAllowed = juryAllowedRoutes.some(
			(route) => pathname === route || pathname.startsWith(route + '/')
		);

		return isAllowed;
	}

	// Default: deny access
	return false;
}

// ============================================
// MAIN HANDLE - Security Middleware
// ============================================

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Inicjalizacja PocketBase
	const pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase;
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	event.locals.pb = pb;
	event.locals.user = pb.authStore.isValid ? pb.authStore.record : null;

	// 2. Route Access Control - sprawdź PRZED rate limiting
	const pathname = event.url.pathname;

	// Skip access control for static files and API routes that need different handling
	const skipAccessControl =
		pathname.startsWith('/_app') || pathname.startsWith('/api/') || pathname.includes('.');

	if (!skipAccessControl) {
		const hasAccess = await checkRouteAccess(pathname, event.locals.user, pb);

		if (!hasAccess) {
			// Not logged in - redirect to login
			if (!event.locals.user) {
				if (pathname !== '/login') {
					throw redirect(303, `/login?redirect=${encodeURIComponent(pathname)}`);
				}
			} else {
				// Logged in but no access - redirect based on role
				if (event.locals.user.admin) {
					// Admin has access everywhere, this shouldn't happen
					throw redirect(303, '/admin');
				} else if (event.locals.user.role === 'jury') {
					// Jury trying to access forbidden route
					if (pathname.startsWith('/upload') || pathname.startsWith('/admin')) {
						throw redirect(303, '/jury');
					}
				} else if (event.locals.user.role === 'participant' || event.locals.user.team) {
					// Participant trying to access forbidden route
					if (pathname.startsWith('/admin') || pathname.startsWith('/jury')) {
						throw redirect(303, '/upload');
					}
					// Trying to access rankings before all teams rated
					if (pathname.startsWith('/rankings')) {
						throw redirect(303, '/?error=rankings_not_available');
					}
				}

				// Default redirect to home
				throw redirect(303, '/');
			}
		}
	}

	// 3. Rate Limiting - ogólny dla wszystkich requestów
	const clientIp = event.getClientAddress();
	const rateLimitKey = event.locals.user?.id ? `user:${event.locals.user.id}` : `ip:${clientIp}`;

	// Podstawowy rate limit: 100 requestów na minutę
	const generalLimit = rateLimiters.general.check(rateLimitKey, 100, 60 * 1000);

	if (!generalLimit.allowed) {
		const retryAfter = Math.ceil((generalLimit.resetTime - Date.now()) / 1000);
		return new Response(
			JSON.stringify({
				error: 'Too many requests',
				retryAfter
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': retryAfter.toString(),
					'X-RateLimit-Limit': '100',
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': new Date(generalLimit.resetTime).toISOString()
				}
			}
		);
	}

	// 4. CSRF Protection - ustaw/sprawdź token

	// Generuj CSRF token dla GET requestów (będzie dostępny dla formularzy)
	if (event.request.method === 'GET') {
		let token = CSRFProtection.getToken(event);
		if (!token) {
			token = CSRFProtection.setToken(event);
		}
		// Dodaj token do locals żeby był dostępny w layout
		event.locals.csrfToken = token;
	} else {
		// Sprawdź CSRF dla POST/PUT/DELETE/PATCH
		// Tylko dla form actions i API endpoints
		if (pathname.includes('?/') || pathname.startsWith('/api/')) {
			const isValid = CSRFProtection.validateToken(event);
			if (!isValid) {
				return new Response(
					JSON.stringify({
						error: 'CSRF token validation failed'
					}),
					{
						status: 403,
						headers: {
							'Content-Type': 'application/json'
						}
					}
				);
			}
		}
	}

	// 5. Auth-specific Rate Limiting
	if (pathname.includes('/login') || pathname.includes('/register')) {
		const authLimit = rateLimiters.auth.check(
			rateLimitKey,
			5, // 5 prób
			15 * 60 * 1000, // w 15 minut
			30 * 60 * 1000 // blokada na 30 minut
		);

		if (!authLimit.allowed) {
			const retryAfter = Math.ceil((authLimit.resetTime - Date.now()) / 1000);
			return new Response(
				JSON.stringify({
					error: 'Too many authentication attempts. Please try again later.',
					retryAfter
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': retryAfter.toString()
					}
				}
			);
		}
	}

	// 6. Upload-specific Rate Limiting
	if (pathname.includes('/upload')) {
		const uploadLimit = rateLimiters.upload.check(
			rateLimitKey,
			10, // 10 uploadów
			60 * 60 * 1000 // na godzinę
		);

		if (!uploadLimit.allowed) {
			const retryAfter = Math.ceil((uploadLimit.resetTime - Date.now()) / 1000);
			return new Response(
				JSON.stringify({
					error: 'Too many upload attempts. Please try again later.',
					retryAfter
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': retryAfter.toString()
					}
				}
			);
		}
	}

	// 7. Inicjalizacja Security helper
	event.locals.security = new Security(event);

	// 8. Resolve response
	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Przepuść nasze security headery
			return (
				name.startsWith('x-') ||
				name === 'content-security-policy' ||
				name === 'strict-transport-security' ||
				name === 'referrer-policy' ||
				name === 'permissions-policy'
			);
		}
	});

	// 9. Dodaj Security Headers
	Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	// 10. Odśwież auth cookie jeśli valid
	if (pb.authStore.isValid) {
		response.headers.append(
			'set-cookie',
			pb.authStore.exportToCookie({
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 7 dni
			})
		);
	}

	// 11. Rate limit headers
	response.headers.set('X-RateLimit-Limit', '100');
	response.headers.set('X-RateLimit-Remaining', generalLimit.remaining.toString());
	response.headers.set('X-RateLimit-Reset', new Date(generalLimit.resetTime).toISOString());

	return response;
};

// ============================================
// HANDLE ERROR - Security-aware error handling
// ============================================

export const handleError = ({ error, event }) => {
	// Nie loguj sensitive data w produkcji
	const isDev = process.env.NODE_ENV === 'development';

	if (isDev) {
		console.error('Error:', error);
	}

	// Zwróć generic error message dla bezpieczeństwa
	return {
		message: 'An error occurred',
		code: error?.code ?? 'UNKNOWN'
	};
};
