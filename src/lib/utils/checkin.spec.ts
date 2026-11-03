import { describe, expect, it } from 'vitest';
import { checkinStatus } from './checkin';

const deadline = '2026-11-14T23:59:00+01:00';
const before = new Date('2026-11-14T20:00:00+01:00').getTime();
const after = new Date('2026-11-15T09:00:00+01:00').getTime();

describe('checkinStatus', () => {
	it('is off without a deadline', () => {
		expect(checkinStatus(undefined, null, before)).toBe('off');
	});
	it('is open until the deadline when nothing was submitted', () => {
		expect(checkinStatus(deadline, null, before)).toBe('open');
	});
	it('is done when the first submission came before the deadline', () => {
		// PocketBase dates use a space instead of "T"
		expect(checkinStatus(deadline, '2026-11-14 21:10:00.000Z', after)).toBe('done');
	});
	it('is missed when the first submission came too late or never', () => {
		expect(checkinStatus(deadline, '2026-11-15 07:00:00.000Z', after)).toBe('missed');
		expect(checkinStatus(deadline, null, after)).toBe('missed');
	});
});
