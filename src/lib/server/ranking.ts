import type { RatingCriterion } from '$lib/types';
import { getAdminClient } from './adminClient';
import { getRatingProgress, getResultsState, stageCriteria, stageOf } from './results';
import { getTeamSubmissions } from './submissions';
import { CACHE_TTL_MS, cached } from './cache';

export interface RankingEntry {
	teamId: string;
	team: string;
	category: string;
	// Average over the jurors who rated the team
	finalGrade: number;
	// Teams with the same total share a place (1, 1, 3)
	rank: number;
	scores: Record<string, number>;
	ratingCount: number;
	status: 'final' | 'provisional';
	completionPercent: number;
	// Placed first by the jury's vote after a tie
	wonTieBreak?: boolean;
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
		// One rating per assigned juror (ignore ratings by others, e.g. before a reassignment).
		// Only complete ratings count: in the final, a rating needs the final presentation score too.
		const ratings = input.ratings.filter(
			(r) =>
				r.team === team.id &&
				juryIds.has(r.jury) &&
				input.criteria.every((c) => typeof r.scores?.[c.key] === 'number')
		);
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

	entries.sort((a, b) => b.finalGrade - a.finalGrade || a.team.localeCompare(b.team));
	return entries.map((entry, i) => ({
		...entry,
		rank:
			i > 0 && entry.finalGrade === entries[i - 1].finalGrade
				? entries.findIndex((e) => e.finalGrade === entry.finalGrade) + 1
				: i + 1
	}));
}

/** Teams tied for first place (empty when there is a single leader). */
export function firstPlaceTie(entries: RankingEntry[]): RankingEntry[] {
	const tied = entries.filter((e) => e.rank === 1);
	return tied.length > 1 ? tied : [];
}

/**
 * Rules §8: a tie is decided by a jury vote. The organizers record the winner, who takes first
 * place; the other tied teams move to second.
 */
export function applyTieWinner(entries: RankingEntry[], winnerId: string | undefined) {
	const tied = firstPlaceTie(entries);
	if (!winnerId || !tied.some((e) => e.teamId === winnerId)) return entries;
	const winner = entries.find((e) => e.teamId === winnerId)!;
	return [
		{ ...winner, rank: 1, wonTieBreak: true },
		...entries
			.filter((e) => e.teamId !== winnerId)
			.map((e) => (e.rank === 1 ? { ...e, rank: 2 } : e))
	];
}

/** Ranking of one category. Callers must check access with canSeeResults first. */
export function getCategoryRanking(category: string) {
	// Hundreds of people open the ranking right after results are published
	return cached(`ranking:${category}`, CACHE_TTL_MS, () => computeCategoryRanking(category));
}

async function computeCategoryRanking(category: string) {
	const pb = await getAdminClient();
	// Teams compete once they submitted something
	const [submissions, progress, state] = await Promise.all([
		getTeamSubmissions({ categories: [category] }),
		getRatingProgress(),
		getResultsState()
	]);

	// Preliminary round: preliminary criteria for every team; final: all criteria for finalists
	const stage = stageOf(state, category);
	const criteria = stageCriteria(category, stage);
	const finalists = state.finalists[category] ?? [];
	const competing =
		stage === 'final' ? submissions.filter((s) => finalists.includes(s.teamId)) : submissions;

	const teamIds = competing.map((s) => s.teamId);
	const ratings = teamIds.length
		? await pb.collection('ratings').getFullList({
				filter: teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || '),
				fields: 'jury,team,scores'
			})
		: [];

	const juryIds = progress[category]?.juries.map((j) => j.id) ?? [];
	const rankings = computeRanking({
		category,
		criteria,
		teams: competing.map((s) => ({ id: s.teamId, name: s.teamName })),
		juryIds,
		ratings: ratings.map((r) => ({ jury: r.jury, team: r.team, scores: r.scores }))
	});

	return {
		category,
		stage,
		criteria,
		totalJuries: juryIds.length,
		rankings: applyTieWinner(rankings, state.tieWinners[category]),
		tie: state.tieWinners[category] ? [] : firstPlaceTie(rankings),
		// Teams that didn't reach the final, listed without a place
		nonFinalists:
			stage === 'final'
				? submissions
						.filter((s) => !finalists.includes(s.teamId))
						.map((s) => s.teamName)
						.sort((a, b) => a.localeCompare(b))
				: []
	};
}
