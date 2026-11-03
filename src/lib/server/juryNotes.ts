import { getAdminClient } from './adminClient';

// Superuser-only collection (no API rules): private notes are read and written only through
// the app, which scopes every query to the logged-in jury member
const NOTES_COLLECTION = 'jury_notes';

export const MAX_NOTE_LENGTH = 10_000;

/** All notes of one jury member, keyed by team id. */
export async function getJuryNotes(juryId: string): Promise<Record<string, string>> {
	const pb = await getAdminClient();
	const records = await pb.collection(NOTES_COLLECTION).getFullList({
		filter: pb.filter('jury = {:jury}', { jury: juryId })
	});
	return Object.fromEntries(records.map((r) => [r.team, r.content || '']));
}

export async function saveJuryNote(juryId: string, teamId: string, content: string): Promise<void> {
	const pb = await getAdminClient();
	const { items } = await pb.collection(NOTES_COLLECTION).getList(1, 1, {
		filter: pb.filter('jury = {:jury} && team = {:team}', { jury: juryId, team: teamId })
	});
	if (items[0]) {
		await pb.collection(NOTES_COLLECTION).update(items[0].id, { content });
	} else {
		await pb.collection(NOTES_COLLECTION).create({ jury: juryId, team: teamId, content });
	}
}
