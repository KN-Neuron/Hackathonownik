import { describe, expect, it } from 'vitest';
import { appConfig, criteriaFor, requiredFor } from './appConfig';

describe('category config', () => {
	it('fills categories without overrides with the defaults', () => {
		expect(criteriaFor('adaptive')).toEqual(appConfig.event.rating_criteria);
		expect(requiredFor('adaptive')).toEqual(['presentation', 'repo', 'video']);
	});

	it('uses category overrides', () => {
		expect(requiredFor('fnirs')).toEqual(['presentation', 'repo']);
		expect(criteriaFor('fnirs').map((c) => c.key)).toContain('methodology');
	});

	it('falls back to the defaults for unknown categories', () => {
		expect(criteriaFor('nope')).toEqual(appConfig.event.rating_criteria);
		expect(requiredFor(undefined)).toEqual(appConfig.event.submission.required);
	});

	it('has unique category keys', () => {
		const keys = appConfig.event.categories.map((c) => c.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
