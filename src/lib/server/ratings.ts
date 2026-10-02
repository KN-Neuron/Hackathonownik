import { appConfig } from './appConfig';

export type ParsedScores =
	| { ok: true; scores: Record<string, number>; finalGrade: number }
	| { ok: false; error: string };

/**
 * Read one score per rating criterion and check it is a whole number in 0..maxScore.
 * The UI slider enforces this too, but a hand-crafted request must not skew the ranking.
 */
export function parseScores(source: Record<string, unknown>): ParsedScores {
	const scores: Record<string, number> = {};
	let finalGrade = 0;

	for (const criterion of appConfig.event.rating_criteria) {
		const raw = source[criterion.key];
		const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;

		if (
			typeof value !== 'number' ||
			!Number.isInteger(value) ||
			value < 0 ||
			value > criterion.maxScore
		) {
			return {
				ok: false,
				error: `${criterion.name} must be a whole number between 0 and ${criterion.maxScore}`
			};
		}

		scores[criterion.key] = value;
		finalGrade += value;
	}

	return { ok: true, scores, finalGrade };
}
