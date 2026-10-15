import { createHash, randomBytes } from 'node:crypto';

/**
 * PocketBase tokens are stateless, and logging in twice within a second gives the same token, so
 * sessions get their own random id (kept inside the encrypted cookie). Logging out remembers that
 * id here, which makes a copy of the cookie worthless while a new login is unaffected.
 *
 * Kept in memory: a restart forgets it, and with several app processes each knows only its own
 * logouts. Good enough to make "log out" mean something at an event of this size.
 */
const SESSION_MS = 7 * 24 * 3_600_000;
const revoked = new Map<string, number>();

const digest = (id: string) => createHash('sha256').update(id).digest('hex');

export const newSessionId = () => randomBytes(16).toString('base64url');

export function revokeSession(id: string | undefined | null, now = Date.now()): void {
	if (!id) return;
	for (const [key, expires] of revoked) if (expires <= now) revoked.delete(key);
	revoked.set(digest(id), now + SESSION_MS);
}

export function isRevoked(id: string | undefined | null, now = Date.now()): boolean {
	if (!id) return false;
	const expires = revoked.get(digest(id));
	return expires !== undefined && expires > now;
}
