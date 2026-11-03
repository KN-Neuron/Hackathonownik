import { describe, expect, it } from 'vitest';
import { applyTieWinner, computeRanking, firstPlaceTie } from './ranking';

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

	it('lets teams with the same total share a place', () => {
		const ranking = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [
				{ id: 't1', name: 'Alpha' },
				{ id: 't2', name: 'Beta' },
				{ id: 't3', name: 'Gamma' }
			],
			juryIds: ['j1'],
			ratings: [
				{ jury: 'j1', team: 't1', scores: { idea: 5, tech: 5 } },
				{ jury: 'j1', team: 't2', scores: { idea: 4, tech: 6 } },
				{ jury: 'j1', team: 't3', scores: { idea: 1, tech: 1 } }
			]
		});
		expect(ranking.map((r) => [r.team, r.rank])).toEqual([
			['Alpha', 1],
			['Beta', 1],
			['Gamma', 3]
		]);
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

	it('lets the organizers record the winner of a tie for first place', () => {
		const ranking = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [
				{ id: 't1', name: 'Alpha' },
				{ id: 't2', name: 'Beta' },
				{ id: 't3', name: 'Gamma' }
			],
			juryIds: ['j1'],
			ratings: [
				{ jury: 'j1', team: 't1', scores: { idea: 5, tech: 5 } },
				{ jury: 'j1', team: 't2', scores: { idea: 4, tech: 6 } },
				{ jury: 'j1', team: 't3', scores: { idea: 1, tech: 1 } }
			]
		});
		expect(firstPlaceTie(ranking).map((r) => r.team)).toEqual(['Alpha', 'Beta']);

		const decided = applyTieWinner(ranking, 't2');
		expect(decided.map((r) => [r.team, r.rank, r.wonTieBreak ?? false])).toEqual([
			['Beta', 1, true],
			['Alpha', 2, false],
			['Gamma', 3, false]
		]);
		// A team that wasn't tied can't win the tie-break
		expect(applyTieWinner(ranking, 't3')).toBe(ranking);
	});

	it('counts only ratings that score every criterion of the stage', () => {
		const [entry] = computeRanking({
			category: 'adaptive',
			criteria,
			teams: [{ id: 't1', name: 'Alpha' }],
			juryIds: ['j1', 'j2'],
			ratings: [
				{ jury: 'j1', team: 't1', scores: { idea: 4, tech: 8 } },
				// preliminary-only rating without "tech" yet
				{ jury: 'j2', team: 't1', scores: { idea: 5 } }
			]
		});
		expect(entry).toMatchObject({ ratingCount: 1, finalGrade: 12, status: 'provisional' });
	});
});
