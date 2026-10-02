import type PocketBase from 'pocketbase';
import { getAdminClient } from './adminClient';

// Single-record collection, superuser-only (no API rules), so only the app can read or change it
const STATE_COLLECTION = 'event_state';

export interface ResultsState {
	published: boolean;
	publishedAt: string | null;
}

/** Fails closed: if the state can't be read, results count as unpublished. */
export async function getResultsState(): Promise<ResultsState> {
	try {
		const pb = await getAdminClient();
		const { items } = await pb.collection(STATE_COLLECTION).getList(1, 1);
		const record = items[0];
		return {
			published: record?.results_published === true,
			publishedAt: record?.results_published_at || null
		};
	} catch (e) {
		console.error('Error reading results state:', e);
		return { published: false, publishedAt: null };
	}
}

export async function setResultsPublished(published: boolean): Promise<void> {
	const pb = await getAdminClient();
	const data = {
		results_published: published,
		results_published_at: published ? new Date().toISOString() : null
	};
	const { items } = await pb.collection(STATE_COLLECTION).getList(1, 1);
	if (items[0]) {
		await pb.collection(STATE_COLLECTION).update(items[0].id, data);
	} else {
		await pb.collection(STATE_COLLECTION).create(data);
	}
}

export interface JuryProgress {
	id: string;
	name: string;
	confirmed: boolean;
	ratedTeams: number;
}

export interface RatingProgress {
	totalTeams: number;
	juries: JuryProgress[];
	confirmedCount: number;
	// Every jury rated every team with a submission and confirmed
	readyToPublish: boolean;
}

/** How far the jury is: teams to rate are the teams with at least one submission. */
export async function getRatingProgress(pb: PocketBase): Promise<RatingProgress> {
	const [presentations, ratings, juryUsers] = await Promise.all([
		pb.collection('presentations').getFullList({ fields: 'team' }),
		pb.collection('ratings').getFullList({ fields: 'jury,team' }),
		pb.collection('users').getFullList({ filter: 'role = "jury"' })
	]);

	const teamIds = new Set(presentations.map((p) => p.team).filter(Boolean));

	const juries = juryUsers.map((jury) => {
		const rated = new Set(
			ratings.filter((r) => r.jury === jury.id && teamIds.has(r.team)).map((r) => r.team)
		);
		return {
			id: jury.id,
			name: jury.name || jury.email,
			confirmed: jury.confirmedRating === true,
			ratedTeams: rated.size
		};
	});

	const confirmedCount = juries.filter((j) => j.confirmed).length;

	return {
		totalTeams: teamIds.size,
		juries,
		confirmedCount,
		readyToPublish:
			juries.length > 0 &&
			teamIds.size > 0 &&
			juries.every((j) => j.confirmed && j.ratedTeams === teamIds.size)
	};
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
