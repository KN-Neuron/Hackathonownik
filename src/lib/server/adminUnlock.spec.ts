import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	AttemptLimiter,
	checkActionPassword,
	createUnlockToken,
	safeEqual,
	verifyUnlockToken
} from './adminUnlock';

const secret = 'test-secret';
const now = 1_000_000;

describe('unlock token', () => {
	it('is valid for its user until it expires', () => {
		const token = createUnlockToken('u1', secret, now, 15);
		expect(verifyUnlockToken(token, 'u1', secret, now + 14 * 60_000)).toBe(now + 15 * 60_000);
		expect(verifyUnlockToken(token, 'u1', secret, now + 15 * 60_000)).toBeNull();
		expect(verifyUnlockToken(token, 'u1', secret, now + 60 * 60_000)).toBeNull();
	});

	it("can't be used by another admin", () => {
		const token = createUnlockToken('u1', secret, now);
		expect(verifyUnlockToken(token, 'u2', secret, now + 1000)).toBeNull();
	});

	it("can't be forged or extended", () => {
		const token = createUnlockToken('u1', secret, now, 1);
		const [user, , signature] = token.split('.');
		// longer expiry with the old signature
		expect(
			verifyUnlockToken(`${user}.${now + 999_999_999}.${signature}`, 'u1', secret, now)
		).toBeNull();
		// signed with another secret
		expect(
			verifyUnlockToken(createUnlockToken('u1', 'other', now), 'u1', secret, now + 1)
		).toBeNull();
		// someone else's id with a valid signature of the first user
		expect(
			verifyUnlockToken(`u2.${token.split('.')[1]}.${signature}`, 'u2', secret, now)
		).toBeNull();
	});

	it('rejects garbage', () => {
		for (const bad of [undefined, '', 'abc', 'a.b', 'a.b.c.d', 'u1.NaN.00', 'u1..']) {
			expect(verifyUnlockToken(bad, 'u1', secret, now)).toBeNull();
		}
	});
});

describe('safeEqual', () => {
	it('compares strings of different lengths without throwing', () => {
		expect(safeEqual('abc', 'abc')).toBe(true);
		expect(safeEqual('abc', 'abcd')).toBe(false);
		expect(safeEqual('', 'x')).toBe(false);
	});
});

describe('AttemptLimiter', () => {
	it('locks a key after too many failures and frees it later', () => {
		const limiter = new AttemptLimiter(3, 60_000);
		limiter.fail('a', now);
		limiter.fail('a', now);
		expect(limiter.lockedFor('a', now)).toBe(0);
		limiter.fail('a', now);
		expect(limiter.lockedFor('a', now + 1000)).toBe(59_000);
		expect(limiter.lockedFor('b', now)).toBe(0);
		expect(limiter.lockedFor('a', now + 60_001)).toBe(0);
	});

	it('starts a fresh series after a lockout and forgets on success', () => {
		const limiter = new AttemptLimiter(2, 1000);
		limiter.fail('a', now);
		limiter.fail('a', now);
		// lockout over: one more failure doesn't lock again immediately
		limiter.fail('a', now + 5000);
		expect(limiter.lockedFor('a', now + 5000)).toBe(0);
		limiter.succeed('a');
		limiter.fail('a', now + 6000);
		expect(limiter.lockedFor('a', now + 6000)).toBe(0);
	});
});

describe('checkActionPassword', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('fails closed when no password is configured', () => {
		vi.stubEnv('ADMIN_ACTION_PASSWORD', '');
		expect(checkActionPassword('')).toBe(false);
		expect(checkActionPassword('anything')).toBe(false);
	});

	it('accepts only the configured password', () => {
		vi.stubEnv('ADMIN_ACTION_PASSWORD', 'correct horse');
		expect(checkActionPassword('correct horse')).toBe(true);
		expect(checkActionPassword('Correct horse')).toBe(false);
		expect(checkActionPassword('')).toBe(false);
	});
});
