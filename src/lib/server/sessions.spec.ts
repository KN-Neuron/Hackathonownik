import { describe, expect, it } from 'vitest';
import { isRevoked, newSessionId, revokeSession } from './sessions';

describe('revoked sessions', () => {
	it('remembers a session after logout, but only that session', () => {
		const a = newSessionId();
		const b = newSessionId();
		expect(a).not.toBe(b);
		revokeSession(a, 1_000);
		expect(isRevoked(a, 2_000)).toBe(true);
		expect(isRevoked(b, 2_000)).toBe(false);
	});

	it('forgets it once the cookie would have expired anyway', () => {
		const id = newSessionId();
		revokeSession(id, 0);
		expect(isRevoked(id, 7 * 24 * 3_600_000 - 1)).toBe(true);
		expect(isRevoked(id, 7 * 24 * 3_600_000 + 1)).toBe(false);
	});

	it('ignores empty ids', () => {
		revokeSession(undefined);
		expect(isRevoked(undefined)).toBe(false);
		expect(isRevoked('')).toBe(false);
	});
});
