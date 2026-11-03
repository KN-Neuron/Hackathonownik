import { describe, expect, it } from 'vitest';
import { matchesTeam } from './teamSearch';

describe('matchesTeam', () => {
	it('matches part of the name, ignoring case', () => {
		expect(matchesTeam('neuro', 'Neuro Labs 1', 4)).toBe(true);
		expect(matchesTeam('axon', 'Neuro Labs 1', 4)).toBe(false);
	});
	it('matches the presentation number', () => {
		expect(matchesTeam('4', 'Neuro Labs 1', 4)).toBe(true);
		expect(matchesTeam('#4', 'Neuro Labs 1', 4)).toBe(true);
		expect(matchesTeam('1', 'Neuro Labs 1', 4)).toBe(false);
	});
	it('shows everything for an empty query', () => {
		expect(matchesTeam('  ', 'Neuro Labs 1', 4)).toBe(true);
	});
});
