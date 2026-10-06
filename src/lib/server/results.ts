import { getAdminClient } from './adminClient';
import { appConfig } from './appConfig';
import { CACHE_TTL_MS, cached, invalidate } from './cache';

// Single-record collection, superuser-only (no API rules), so only the app can read or change it
const STATE_COLLECTION = 'event_state';

export interface ResultsState {
	// Categories whose results participants can see
	publishedCategories: string[];
	publishedAt: Record<string, string>;
}

/** Fails closed: if the state can't be read, no category counts as published. */
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
			publishedAt:
				record?.published_at && typeof record.published_at === 'object' ? record.published_at : {}
		};
	} catch (e) {
		console.error('Error reading results state:', e);
		return { publishedCategories: [], publishedAt: {} };
	}
}

export async function setCategoryPublished(category: string, published: boolean): Promise<void> {
	const pb = await getAdminClient();
	const { items } = await pb.collection(STATE_COLLECTION).getList(1, 1);
	const current = items[0];
	const categories = new Set<string>(
		Array.isArray(current?.published_categories) ? current.published_categories : []
	);
	const publishedAt: Record<string, string> = { ...(current?.published_at || {}) };

	if (published) {
		categories.add(category);
		publishedAt[category] = new Date().toISOString();
	} else {
		categories.delete(category);
		delete publishedAt[category];
	}

	const data = { published_categories: [...categories], published_at: publishedAt };
	if (current) {
		await pb.collection(STATE_COLLECTION).update(current.id, data);
	} else {
		await pb.collection(STATE_COLLECTION).create(data);
	}
	invalidate('results-state');
}

export interface JuryProgress {
	id: string;
	name: string;
	confirmed: boolean;
	ratedTeams: number;
}

export interface CategoryProgress {
	category: string;
	totalTeams: number;
	juries: JuryProgress[];
	confirmedCount: number;
	// Every assigned jury member rated every team of the category and confirmed
	readyToPublish: boolean;
}

export interface ProgressInput {
	// Teams with at least one submission, with their current category
	teams: { id: string; category: string }[];
	ratings: { jury: string; team: string }[];
	juries: {
		id: string;
		name?: string;
		email?: string;
		jury_categories?: unknown;
		confirmed_categories?: unknown;
	}[];
}

const asList = (value: unknown): string[] => (Array.isArray(value) ? value : []);

/** Rating progress per configured category. */
export function computeProgress(input: ProgressInput): Record<string, CategoryProgress> {
	const progress: Record<string, CategoryProgress> = {};

	for (const { key } of appConfig.event.categories) {
		const teamIds = new Set(input.teams.filter((t) => t.category === key).map((t) => t.id));
		const juries = input.juries
			.filter((jury) => asList(jury.jury_categories).includes(key))
			.map((jury) => ({
				id: jury.id,
				name: jury.name || jury.email || jury.id,
				confirmed: asList(jury.confirmed_categories).includes(key),
				ratedTeams: new Set(
					input.ratings.filter((r) => r.jury === jury.id && teamIds.has(r.team)).map((r) => r.team)
				).size
			}));

		progress[key] = {
			category: key,
			totalTeams: teamIds.size,
			juries,
			confirmedCount: juries.filter((j) => j.confirmed).length,
			readyToPublish:
				juries.length > 0 &&
				teamIds.size > 0 &&
				juries.every((j) => j.confirmed && j.ratedTeams === teamIds.size)
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
	const [presentations, ratings, juries] = await Promise.all([
		pb
			.collection('presentations')
			.getFullList({ fields: 'team,expand.team.category', expand: 'team' }),
		pb.collection('ratings').getFullList({ fields: 'jury,team' }),
		pb.collection('users').getFullList({
			filter: 'role = "jury"',
			fields: 'id,name,email,jury_categories,confirmed_categories'
		})
	]);

	const teams = new Map<string, string>();
	for (const p of presentations) {
		if (p.team) teams.set(p.team, p.expand?.team?.category ?? '');
	}

	return computeProgress({
		teams: [...teams].map(([id, category]) => ({ id, category })),
		ratings: ratings.map((r) => ({ jury: r.jury, team: r.team })),
		juries
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
