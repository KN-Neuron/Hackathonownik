import type { RatingCriterion } from '$lib/types';

export type ParsedScores =
	| { ok: true; scores: Record<string, number>; finalGrade: number }
	| { ok: false; error: string };

/**
 * Read one score per rating criterion of the team's category and check it is a whole number
 * in 1..maxScore (rules §8). The UI slider enforces this too, but a hand-crafted request must not skew
 * the ranking.
 */
export function parseScores(
	source: Record<string, unknown>,
	criteria: RatingCriterion[]
): ParsedScores {
	const scores: Record<string, number> = {};
	let finalGrade = 0;

	for (const criterion of criteria) {
		const raw = source[criterion.key];
		const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;

		if (
			typeof value !== 'number' ||
			!Number.isInteger(value) ||
			value < 1 ||
			value > criterion.maxScore
		) {
			return {
				ok: false,
				error: `${criterion.name} must be a whole number between 1 and ${criterion.maxScore}`
			};
		}

		scores[criterion.key] = value;
		finalGrade += value;
	}

	return { ok: true, scores, finalGrade };
}
