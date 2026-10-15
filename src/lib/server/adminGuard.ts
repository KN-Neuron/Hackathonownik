import { fail, type ActionFailure, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { audit } from './audit';
import {
	UNLOCK_COOKIE,
	isActionPasswordConfigured,
	unlockSecret,
	verifyUnlockToken
} from './adminUnlock';

type GuardEvent = Pick<RequestEvent, 'locals' | 'cookies' | 'getClientAddress'>;

/** When the organizer's unlock ends (ms since epoch), null while sensitive actions are locked. */
export function unlockedUntil(cookies: Cookies, userId: string | undefined): number | null {
	if (!userId) return null;
	return verifyUnlockToken(cookies.get(UNLOCK_COOKIE), userId, unlockSecret());
}

/** What the admin pages need to render the lock. */
export function unlockStatus(event: Pick<RequestEvent, 'locals' | 'cookies'>) {
	return {
		configured: isActionPasswordConfigured(),
		unlockedUntil: unlockedUntil(event.cookies, event.locals.user?.id)
	};
}

/**
 * Gate for every decision that changes data or shows results: the caller must be an admin,
 * send the CSRF token and have unlocked sensitive actions with the extra password.
 * Returns the failure to send back, or null when the action may go ahead.
 */
export async function guardSensitive(
	event: GuardEvent,
	formData: FormData,
	action: string
): Promise<ActionFailure<{ success: false; message: string; needsUnlock?: boolean }> | null> {
	const { locals, cookies } = event;

	try {
		locals.security.isAdmin();
	} catch {
		return fail(403, { success: false, message: 'Unauthorized' });
	}

	const csrfToken = formData.get('csrf_token');
	if (!locals.csrfToken || locals.csrfToken !== csrfToken) {
		return fail(403, { success: false, message: 'Invalid security token' });
	}

	if (!isActionPasswordConfigured()) {
		await audit(event, `denied:${action}`, { reason: 'ADMIN_ACTION_PASSWORD is not set' }, false);
		return fail(403, {
			success: false,
			needsUnlock: true,
			message:
				'Sensitive actions are disabled until ADMIN_ACTION_PASSWORD is set in the server environment.'
		});
	}

	if (!unlockedUntil(cookies, locals.user?.id)) {
		await audit(event, `denied:${action}`, { reason: 'locked' }, false);
		return fail(403, {
			success: false,
			needsUnlock: true,
			message: 'Unlock sensitive actions with the admin action password first (box at the top).'
		});
	}

	return null;
}
