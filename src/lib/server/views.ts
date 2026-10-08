import { getAdminClient } from './adminClient';

// Superuser-only collection: which juror opened which material of which team
const VIEWS_COLLECTION = 'jury_views';

export const VIEW_ITEMS = ['presentation', 'final_presentation', 'video'] as const;
export type ViewItem = (typeof VIEW_ITEMS)[number];

export interface JuryView {
	jury: string;
	team: string;
	item: ViewItem;
	count: number;
	firstAt: string;
	lastAt: string;
}

/** Record that a juror opened a team's material. Never throws: it's only bookkeeping. */
export async function recordView(juryId: string, teamId: string, item: ViewItem): Promise<void> {
	try {
		const pb = await getAdminClient();
		const now = new Date().toISOString();
		const { items } = await pb.collection(VIEWS_COLLECTION).getList(1, 1, {
			filter: pb.filter('jury = {:jury} && team = {:team} && item = {:item}', {
				jury: juryId,
				team: teamId,
				item
			})
		});
		if (items[0]) {
			await pb
				.collection(VIEWS_COLLECTION)
				.update(items[0].id, { count: (items[0].count || 0) + 1, last_at: now });
		} else {
			await pb
				.collection(VIEWS_COLLECTION)
				.create({ jury: juryId, team: teamId, item, count: 1, first_at: now, last_at: now });
		}
	} catch (e) {
		console.error('Error recording a view:', e);
	}
}

/** Views of the given teams (optionally of one juror). */
export async function getViews(teamIds: string[], juryId?: string): Promise<JuryView[]> {
	if (teamIds.length === 0) return [];
	const pb = await getAdminClient();
	const teams = teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || ');
	const records = await pb.collection(VIEWS_COLLECTION).getFullList({
		filter: juryId ? `(${teams}) && ${pb.filter('jury = {:jury}', { jury: juryId })}` : teams
	});
	return records.map((r) => ({
		jury: r.jury,
		team: r.team,
		item: r.item,
		count: r.count,
		firstAt: r.first_at,
		lastAt: r.last_at
	}));
}
