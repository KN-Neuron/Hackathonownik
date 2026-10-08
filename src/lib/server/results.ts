import type { RatingCriterion } from '$lib/types';
import { getAdminClient } from './adminClient';
import { appConfig, criteriaFor } from './appConfig';
import { CACHE_TTL_MS, cached, invalidate } from './cache';

// Single-record collection, superuser-only (no API rules), so only the app can read or change it
const STATE_COLLECTION = 'event_state';

export type Stage = 'preliminary' | 'final';

/** Judging state of the event (rules §8: preliminary round, then a final of the best teams). */
export interface ResultsState {
	// Categories whose results participants can see
	publishedCategories: string[];
	publishedAt: Record<string, string>;
	// Current stage per category ("preliminary" when not set)
	stages: Record<string, Stage>;
	// Teams that reached the final, per category
	finalists: Record<string, string[]>;
	// Team that won a tie for first place by jury vote, per category
	tieWinners: Record<string, string>;
	// Presentation order set by the organizers, per category (team ids)
	orders: Record<string, string[]>;
}

const asObject = <T>(value: unknown): Record<string, T> =>
	value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, T>) : {};

/** Fails closed: if the state can't be read, nothing is published and every category is preliminary. */
export function getResultsState(): Promise<ResultsState> {
	return cached('results-state', CACHE_TTL_MS, readResultsState);
}

async function readResultsState(): Promise<ResultsState> {
	try {
		const pb = await getAdminClient();
		const { items } = await pb.collection(STATE_COLLECTION).getList(1, 1);
		const record = items[0];
		return {
			publishedCategories: Array.isArray(record?.published_categories)
				? record.published_categories
				: [],
			publishedAt: asObject(record?.published_at),
			stages: asObject(record?.stages),
			finalists: asObject(record?.finalists),
			tieWinners: asObject(record?.tie_winners),
			orders: asObject(record?.orders)
		};
	} catch (e) {
		console.error('Error reading results state:', e);
		return {
			publishedCategories: [],
			publishedAt: {},
			stages: {},
			finalists: {},
			tieWinners: {},
			orders: {}
		};
	}
}

export const stageOf = (state: ResultsState, category: string): Stage =>
	state.stages[category] === 'final' ? 'final' : 'preliminary';

/** Read-modify-write of the single state record. */
async function updateState(change: (record: Record<string, unknown>) => Record<string, unknown>) {
	const pb = await getAdminClient();
	const { items } = await pb.collection(STATE_COLLECTION).getList(1, 1);
	const current = items[0] ?? {};
	const data = change(current);
	if (items[0]) {
		await pb.collection(STATE_COLLECTION).update(items[0].id, data);
	} else {
		await pb.collection(STATE_COLLECTION).create(data);
	}
	invalidate('results-state', 'rating-progress', 'ranking:');
}

export async function setCategoryPublished(category: string, published: boolean): Promise<void> {
	await updateState((current) => {
		const categories = new Set<string>(
			Array.isArray(current.published_categories) ? current.published_categories : []
		);
		const publishedAt = { ...asObject<string>(current.published_at) };
		if (published) {
			categories.add(category);
			publishedAt[category] = new Date().toISOString();
		} else {
			categories.delete(category);
			delete publishedAt[category];
		}
		return { published_categories: [...categories], published_at: publishedAt };
	});
}

/** Move a category to the final with these finalists, or back to the preliminary round. */
export async function setCategoryStage(
	category: string,
	stage: Stage,
	finalists: string[] = []
): Promise<void> {
	await updateState((current) => {
		const stages = { ...asObject<Stage>(current.stages), [category]: stage };
		const allFinalists = { ...asObject<string[]>(current.finalists) };
		const tieWinners = { ...asObject<string>(current.tie_winners) };
		if (stage === 'final') allFinalists[category] = finalists;
		else delete allFinalists[category];
		delete tieWinners[category];
		return { stages, finalists: allFinalists, tie_winners: tieWinners };
	});
}

export async function setPresentationOrder(category: string, teamIds: string[]): Promise<void> {
	await updateState((current) => ({
		orders: { ...asObject<string[]>(current.orders), [category]: teamIds }
	}));
}

/**
 * Sort teams by the organizers' presentation order; teams missing from it come last,
 * alphabetically. Returns each team with its 1-based position.
 */
export function inPresentationOrder<T>(
	teams: T[],
	order: string[] | undefined,
	id: (team: T) => string,
	name: (team: T) => string
): (T & { order: number })[] {
	const position = new Map((order ?? []).map((teamId, i) => [teamId, i]));
	return [...teams]
		.sort((a, b) => {
			const pa = position.get(id(a)) ?? Infinity;
			const pb = position.get(id(b)) ?? Infinity;
			return pa !== pb ? pa - pb : name(a).localeCompare(name(b));
		})
		.map((team, i) => ({ ...team, order: i + 1 }));
}

export async function setTieWinner(category: string, teamId: string | null): Promise<void> {
	await updateState((current) => {
		const tieWinners = { ...asObject<string>(current.tie_winners) };
		if (teamId) tieWinners[category] = teamId;
		else delete tieWinners[category];
		return { tie_winners: tieWinners };
	});
}

/** Criteria the jury rates in the current stage: preliminary ones, or all of them in the final. */
export function stageCriteria(category: string, stage: Stage): RatingCriterion[] {
	const criteria = criteriaFor(category);
	return stage === 'final' ? criteria : criteria.filter((c) => c.stage !== 'final');
}

export interface JuryProgress {
	id: string;
	name: string;
	confirmed: boolean;
	ratedTeams: number;
}

export interface CategoryProgress {
	category: string;
	stage: Stage;
	// Teams rated in the current stage: every team with a submission, or the finalists
	teamIds: string[];
	totalTeams: number;
	juries: JuryProgress[];
	confirmedCount: number;
	// Every assigned jury member rated every team of the stage and confirmed
	readyToPublish: boolean;
}

export interface ProgressInput {
	// Teams with at least one submission, with their current category
	teams: { id: string; category: string }[];
	ratings: { jury: string; team: string; scores?: unknown }[];
	juries: {
		id: string;
		name?: string;
		email?: string;
		jury_categories?: unknown;
		confirmed_categories?: unknown;
	}[];
	state?: Pick<ResultsState, 'stages' | 'finalists'>;
}

const asList = (value: unknown): string[] => (Array.isArray(value) ? value : []);

/** Rating progress of the current stage of every configured category. */
export function computeProgress(input: ProgressInput): Record<string, CategoryProgress> {
	const progress: Record<string, CategoryProgress> = {};
	const stages = input.state?.stages ?? {};
	const finalists = input.state?.finalists ?? {};

	for (const { key } of appConfig.event.categories) {
		const stage: Stage = stages[key] === 'final' ? 'final' : 'preliminary';
		const submitted = input.teams.filter((t) => t.category === key).map((t) => t.id);
		const teamIds =
			stage === 'final' ? submitted.filter((id) => (finalists[key] ?? []).includes(id)) : submitted;
		const teams = new Set(teamIds);
		// A rating counts once it has a score for every criterion of the stage
		const criteria = stageCriteria(key, stage).map((c) => c.key);
		const complete = (r: ProgressInput['ratings'][number]) => {
			const scores = asObject<unknown>(r.scores);
			return criteria.every((c) => typeof scores[c] === 'number');
		};

		const juries = input.juries
			.filter((jury) => asList(jury.jury_categories).includes(key))
			.map((jury) => ({
				id: jury.id,
				name: jury.name || jury.email || jury.id,
				confirmed: asList(jury.confirmed_categories).includes(key),
				ratedTeams: new Set(
					input.ratings
						.filter((r) => r.jury === jury.id && teams.has(r.team) && complete(r))
						.map((r) => r.team)
				).size
			}));

		progress[key] = {
			category: key,
			stage,
			teamIds,
			totalTeams: teams.size,
			juries,
			confirmedCount: juries.filter((j) => j.confirmed).length,
			readyToPublish:
				juries.length > 0 &&
				teams.size > 0 &&
				juries.every((j) => j.confirmed && j.ratedTeams === teams.size)
		};
	}

	return progress;
}

/** Progress of every category. Reads as superuser; it only exposes counts. */
export function getRatingProgress(): Promise<Record<string, CategoryProgress>> {
	return cached('rating-progress', CACHE_TTL_MS, readRatingProgress);
}

/** Call after anything that changes ratings, confirmations, jurors or teams. */
export function invalidateRatings(): void {
	invalidate('rating-progress', 'ranking:');
}

async function readRatingProgress(): Promise<Record<string, CategoryProgress>> {
	const pb = await getAdminClient();
	const [presentations, ratings, juries, state] = await Promise.all([
		pb
			.collection('presentations')
			.getFullList({ fields: 'team,expand.team.category', expand: 'team' }),
		pb.collection('ratings').getFullList({ fields: 'jury,team,scores' }),
		pb.collection('users').getFullList({
			filter: 'role = "jury"',
			fields: 'id,name,email,jury_categories,confirmed_categories'
		}),
		getResultsState()
	]);

	const teams = new Map<string, string>();
	for (const p of presentations) {
		if (p.team) teams.set(p.team, p.expand?.team?.category ?? '');
	}

	return computeProgress({
		teams: [...teams].map(([id, category]) => ({ id, category })),
		ratings: ratings.map((r) => ({ jury: r.jury, team: r.team, scores: r.scores })),
		juries,
		state
	});
}

/** Jury feedback for one team, without jury names. Only call once results are published. */
export async function getTeamFeedback(teamId: string): Promise<string[]> {
	const pb = await getAdminClient();
	const ratings = await pb.collection('ratings').getFullList({
		filter: pb.filter('team = {:team}', { team: teamId }),
		fields: 'comments'
	});
	return ratings.map((r) => (r.comments || '').trim()).filter(Boolean);
}
