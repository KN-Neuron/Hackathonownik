import type { RatingCriterion } from '$lib/types';
import { getAdminClient } from './adminClient';
import { criteriaFor } from './appConfig';
import { getRatingProgress } from './results';
import { getTeamSubmissions } from './submissions';

export interface RankingEntry {
	teamId: string;
	team: string;
	category: string;
	// Average over the jurors who rated the team
	finalGrade: number;
	scores: Record<string, number>;
	ratingCount: number;
	status: 'final' | 'provisional';
	completionPercent: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Rank the teams of one category by the average total score of its jurors. Averages keep the
 * ranking fair if a category ends up with a different number of jurors or a missing rating.
 */
export function computeRanking(input: {
	category: string;
	criteria: RatingCriterion[];
	teams: { id: string; name: string }[];
	juryIds: string[];
	ratings: { jury: string; team: string; scores?: Record<string, unknown> | null }[];
}): RankingEntry[] {
	const juryIds = new Set(input.juryIds);
	const totalJuries = juryIds.size;

	const entries = input.teams.map((team) => {
		// One rating per assigned juror (ignore ratings by others, e.g. before a reassignment)
		const ratings = input.ratings.filter((r) => r.team === team.id && juryIds.has(r.jury));
		const count = ratings.length;

		const scores: Record<string, number> = {};
		let total = 0;
		for (const criterion of input.criteria) {
			const sum = ratings.reduce((acc, r) => acc + (Number(r.scores?.[criterion.key]) || 0), 0);
			scores[criterion.key] = count ? round(sum / count) : 0;
			total += count ? sum / count : 0;
		}

		return {
			teamId: team.id,
			team: team.name,
			category: input.category,
			finalGrade: round(total),
			scores,
			ratingCount: count,
			status:
				totalJuries > 0 && count >= totalJuries ? ('final' as const) : ('provisional' as const),
			completionPercent: totalJuries ? Math.round((count / totalJuries) * 100) : 0
		};
	});

	return entries.sort((a, b) => b.finalGrade - a.finalGrade || a.team.localeCompare(b.team));
}

/** Ranking of one category. Callers must check access with canSeeResults first. */
export async function getCategoryRanking(category: string) {
	const pb = await getAdminClient();
	const criteria = criteriaFor(category);
	// Teams compete once they submitted something
	const [submissions, progress] = await Promise.all([
		getTeamSubmissions({ categories: [category] }),
		getRatingProgress()
	]);

	const teamIds = submissions.map((s) => s.teamId);
	const ratings = teamIds.length
		? await pb.collection('ratings').getFullList({
				filter: teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || '),
				fields: 'jury,team,scores'
			})
		: [];

	const juryIds = progress[category]?.juries.map((j) => j.id) ?? [];

	return {
		category,
		criteria,
		totalJuries: juryIds.length,
		rankings: computeRanking({
			category,
			criteria,
			teams: submissions.map((s) => ({ id: s.teamId, name: s.teamName })),
			juryIds,
			ratings: ratings.map((r) => ({ jury: r.jury, team: r.team, scores: r.scores }))
		})
	};
}
