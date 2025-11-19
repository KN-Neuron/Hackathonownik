import PocketBase, { ClientResponseError } from 'pocketbase';
import type { TypedPocketBase, User } from '$lib/types';
import { browser, dev } from '$app/environment';
import { error, type RequestEvent } from '@sveltejs/kit';

export const pbError = (e: unknown) => {
	const err = e as ClientResponseError;
	if (dev) console.log(err?.response);

	// Nie zwracaj szczegółowych błędów w produkcji
	const message = dev ? err?.response?.message : 'An error occurred. Please try again.';

	error(err?.status || 500, message);
};

function createPocketBase(): TypedPocketBase {
	const pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase;
	if (browser) {
		pb.authStore.loadFromCookie(document.cookie);
	}
	return pb;
}

export const pb = $state(createPocketBase());

/**
 * Security helper class for authorization and authentication
 * This is used in page/layout server files
 */
export class Security {
	private readonly user: User | null;
	private readonly event: RequestEvent;

	constructor(event: RequestEvent) {
		this.event = event;
		this.user = event.locals.user || null;
	}

	/**
	 * Check if user is authenticated
	 * @throws {Error} 401 if not authenticated
	 */
	isAuthenticated(): this {
		if (!this.user) {
			error(401, 'Unauthorized. Please log in.');
		}
		return this;
	}

	/**
	 * Check if user is admin
	 * @throws {Error} 403 if not admin
	 */
	isAdmin(): this {
		this.isAuthenticated();
		if (!this.user?.admin) {
			error(403, 'Forbidden. Admin access required.');
		}
		return this;
	}

	/**
	 * Check if user is jury member
	 * @throws {Error} 403 if not jury
	 */
	isJury(): this {
		this.isAuthenticated();
		if (this.user?.role !== 'jury' && !this.user?.admin) {
			error(403, 'Forbidden. Jury access required.');
		}
		return this;
	}

	/**
	 * Check if user belongs to specified team
	 * @param teamId - The team ID to check
	 * @throws {Error} 403 if not team member
	 */
	isTeamMember(teamId: string): this {
		this.isAuthenticated();
		if (this.user?.team !== teamId && !this.user?.admin) {
			error(403, "Forbidden. You can only access your team's resources.");
		}
		return this;
	}

	/**
	 * Get current user
	 */
	getUser(): User | null {
		return this.user;
	}

	/**
	 * Validate CSRF token
	 * @throws {Error} 403 if CSRF validation fails
	 */
	validateCSRF(): this {
		// This is handled in hooks.server.ts
		// Kept here for API compatibility
		return this;
	}
}
