import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Second factor for the organizers' decisions (publishing results, adding or changing people,
 * moving teams…). Even a logged-in admin account has to type the ADMIN_ACTION_PASSWORD, which
 * lives only in the server's environment. The unlock lasts a few minutes and is bound to the
 * admin who typed it.
 */
export const UNLOCK_COOKIE = 'admin_unlock';
export const UNLOCK_MINUTES = 15;

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60_000;

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time comparison of two strings of any length. */
export function safeEqual(a: string, b: string): boolean {
	return timingSafeEqual(sha256(a), sha256(b));
}

/** Signed token: "<userId>.<expiresAtMs>.<signature>" */
export function createUnlockToken(
	userId: string,
	secret: string,
	now = Date.now(),
	minutes = UNLOCK_MINUTES
): string {
	const expires = now + minutes * 60_000;
	const payload = `${userId}.${expires}`;
	const signature = createHmac('sha256', secret).update(payload).digest('hex');
	return `${payload}.${signature}`;
}

/** Expiry time of a valid token of this user, otherwise null. */
export function verifyUnlockToken(
	token: string | undefined,
	userId: string,
	secret: string,
	now = Date.now()
): number | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [tokenUser, expiresText, signature] = parts;
	const expected = createHmac('sha256', secret).update(`${tokenUser}.${expiresText}`).digest('hex');
	if (!safeEqual(signature, expected)) return null;
	if (tokenUser !== userId) return null;
	const expires = Number(expiresText);
	return Number.isFinite(expires) && expires > now ? expires : null;
}

/** Counts wrong passwords per key and locks the key for a while after too many. */
export class AttemptLimiter {
	private failures = new Map<string, { count: number; lockedUntil: number }>();

	constructor(
		private max = MAX_FAILURES,
		private lockoutMs = LOCKOUT_MS
	) {}

	/** Milliseconds the key stays locked, 0 when it may try. */
	lockedFor(key: string, now = Date.now()): number {
		const entry = this.failures.get(key);
		return entry && entry.lockedUntil > now ? entry.lockedUntil - now : 0;
	}

	fail(key: string, now = Date.now()): void {
		const entry = this.failures.get(key) ?? { count: 0, lockedUntil: 0 };
		// A finished lockout starts a fresh series
		if (entry.lockedUntil && entry.lockedUntil <= now) {
			entry.count = 0;
			entry.lockedUntil = 0;
		}
		entry.count += 1;
		if (entry.count >= this.max) entry.lockedUntil = now + this.lockoutMs;
		this.failures.set(key, entry);
	}

	succeed(key: string): void {
		this.failures.delete(key);
	}
}

export const unlockLimiter = new AttemptLimiter();

/** Signing key: derived from the cookie key so there's nothing more to configure. */
export function unlockSecret(): string {
	const key = process.env.COOKIE_ENCRYPTION_KEY;
	if (!key) throw new Error('COOKIE_ENCRYPTION_KEY is not defined');
	return `admin-unlock:${key}`;
}

export const isActionPasswordConfigured = () => Boolean(process.env.ADMIN_ACTION_PASSWORD);

/** True when the typed password matches ADMIN_ACTION_PASSWORD (false if it isn't set). */
export function checkActionPassword(input: string): boolean {
	const expected = process.env.ADMIN_ACTION_PASSWORD;
	return Boolean(expected) && safeEqual(input, expected!);
}
