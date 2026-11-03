import { describe, expect, it } from 'vitest';
import { appConfig, criteriaFor, requiredFor } from './appConfig';

describe('category config', () => {
	it('fills categories without overrides with the defaults', () => {
		expect(criteriaFor('adaptive')).toEqual(appConfig.event.rating_criteria);
		expect(requiredFor('adaptive')).toEqual(['presentation', 'repo', 'video']);
	});

	it('follows the rules: 25 points, the final presentation rated only in the final', () => {
		for (const { key } of appConfig.event.categories) {
			const criteria = criteriaFor(key);
			expect(criteria.reduce((sum, c) => sum + c.maxScore, 0)).toBe(25);
			expect(criteria.filter((c) => c.stage === 'final').map((c) => c.key)).toEqual([
				'finalPresentation'
			]);
		}
		expect(appConfig.event.finalists_per_category).toBe(5);
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
