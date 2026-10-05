import { describe, expect, it } from 'vitest';
import { computeRanking } from './ranking';

const criteria = [
	{ key: 'idea', name: 'Idea', maxScore: 5 },
	{ key: 'tech', name: 'Tech', maxScore: 10 }
];

describe('computeRanking', () => {
	it('ranks by the average of the assigned jurors and marks complete teams final', () => {
		const ranking = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [
				{ id: 't1', name: 'Alpha' },
				{ id: 't2', name: 'Beta' }
			],
			juryIds: ['j1', 'j2'],
			ratings: [
				{ jury: 'j1', team: 't1', scores: { idea: 4, tech: 6 } },
				{ jury: 'j2', team: 't1', scores: { idea: 2, tech: 8 } },
				{ jury: 'j1', team: 't2', scores: { idea: 5, tech: 10 } }
			]
		});

		expect(ranking.map((r) => r.team)).toEqual(['Beta', 'Alpha']);
		expect(ranking[0]).toMatchObject({
			finalGrade: 15,
			ratingCount: 1,
			status: 'provisional',
			completionPercent: 50
		});
		expect(ranking[1]).toMatchObject({
			finalGrade: 10,
			scores: { idea: 3, tech: 7 },
			ratingCount: 2,
			status: 'final'
		});
	});

	it('ignores ratings by people who are not jurors of the category', () => {
		const [entry] = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [{ id: 't1', name: 'Alpha' }],
			juryIds: ['j1'],
			ratings: [
				{ jury: 'j1', team: 't1', scores: { idea: 1, tech: 1 } },
				{ jury: 'admin', team: 't1', scores: { idea: 5, tech: 10 } }
			]
		});
		expect(entry.finalGrade).toBe(2);
		expect(entry.ratingCount).toBe(1);
	});

	it('gives unrated teams zero', () => {
		const [entry] = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [{ id: 't1', name: 'Alpha' }],
			juryIds: ['j1'],
			ratings: []
		});
		expect(entry).toMatchObject({ finalGrade: 0, ratingCount: 0, status: 'provisional' });
	});
});
