import { describe, expect, it } from 'vitest';
import { computeProgress } from './results';

// Uses the categories from app_config.yaml: adaptive and fnirs are two of them
const teams = [
	{ id: 'a1', category: 'adaptive' },
	{ id: 'a2', category: 'adaptive' },
	{ id: 'f1', category: 'fnirs' }
];

describe('computeProgress', () => {
	it('counts only the teams and jurors of each category', () => {
		const progress = computeProgress({
			teams,
			ratings: [
				{ jury: 'j1', team: 'a1' },
				{ jury: 'j1', team: 'a2' },
				// a rating of another category's team doesn't count for adaptive
				{ jury: 'j1', team: 'f1' }
			],
			juries: [
				{ id: 'j1', name: 'A', jury_categories: ['adaptive'], confirmed_categories: ['adaptive'] }
			]
		});

		expect(progress.adaptive.totalTeams).toBe(2);
		expect(progress.adaptive.juries).toEqual([
			{ id: 'j1', name: 'A', confirmed: true, ratedTeams: 2 }
		]);
		expect(progress.adaptive.readyToPublish).toBe(true);
		// fnirs has a team but no juror yet
		expect(progress.fnirs.juries).toEqual([]);
		expect(progress.fnirs.readyToPublish).toBe(false);
	});

	it('is ready only when every juror of the category rated all teams and confirmed', () => {
		const progress = computeProgress({
			teams,
			ratings: [
				{ jury: 'j1', team: 'a1' },
				{ jury: 'j1', team: 'a2' },
				{ jury: 'j2', team: 'a1' }
			],
			juries: [
				{ id: 'j1', jury_categories: ['adaptive'], confirmed_categories: ['adaptive'] },
				{ id: 'j2', jury_categories: ['adaptive'], confirmed_categories: ['adaptive'] }
			]
		});

		expect(progress.adaptive.confirmedCount).toBe(2);
		expect(progress.adaptive.readyToPublish).toBe(false);
	});

	it('tracks confirmation per category for jurors of several categories', () => {
		const progress = computeProgress({
			teams,
			ratings: [
				{ jury: 'j1', team: 'a1' },
				{ jury: 'j1', team: 'a2' },
				{ jury: 'j1', team: 'f1' }
			],
			juries: [
				{ id: 'j1', jury_categories: ['adaptive', 'fnirs'], confirmed_categories: ['fnirs'] }
			]
		});

		expect(progress.adaptive.readyToPublish).toBe(false);
		expect(progress.fnirs.readyToPublish).toBe(true);
	});

	it('ignores malformed category fields', () => {
		const progress = computeProgress({
			teams,
			ratings: [],
			juries: [{ id: 'j1', jury_categories: 'adaptive', confirmed_categories: null }]
		});
		expect(progress.adaptive.juries).toEqual([]);
	});
});
