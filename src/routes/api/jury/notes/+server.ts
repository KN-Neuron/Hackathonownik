import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canJudgeCategory, getTeamCategory, isJuryOrAdmin } from '$lib/server/access';
import { MAX_NOTE_LENGTH, saveJuryNote } from '$lib/server/juryNotes';

// Save the logged-in jury member's private note for a team
export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !isJuryOrAdmin(locals.user)) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const body = await request.json().catch(() => null);
	const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
	const content = typeof body?.content === 'string' ? body.content : null;

	if (!teamId || content === null) {
		return json({ error: 'teamId and content are required' }, { status: 400 });
	}
	if (content.length > MAX_NOTE_LENGTH) {
		return json({ error: `Notes can have at most ${MAX_NOTE_LENGTH} characters` }, { status: 400 });
	}

	if (!canJudgeCategory(locals.user, await getTeamCategory(teamId))) {
		return json({ error: 'This team is not in your category' }, { status: 403 });
	}

	try {
		await saveJuryNote(locals.user.id, teamId, content);
		return json({ success: true });
	} catch (err) {
		console.error('Error saving jury note:', err);
		return json({ error: 'Failed to save notes' }, { status: 500 });
	}
};
