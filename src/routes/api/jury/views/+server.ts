import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canJudgeCategory, getTeamCategory } from '$lib/server/access';
import { recordView, VIEW_ITEMS, type ViewItem } from '$lib/server/views';

// The juror opened a team's demo video (PDF views are recorded when the file is served)
export const POST: RequestHandler = async ({ locals, request }) => {
	const body = await request.json().catch(() => null);
	const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
	const item = body?.item as ViewItem;

	if (!locals.user || locals.user.role !== 'jury') {
		return json({ recorded: false });
	}
	if (!teamId || !VIEW_ITEMS.includes(item)) {
		return json({ error: 'teamId and item are required' }, { status: 400 });
	}
	if (!canJudgeCategory(locals.user, await getTeamCategory(teamId))) {
		return json({ error: 'This team is not in your category' }, { status: 403 });
	}

	await recordView(locals.user.id, teamId, item);
	return json({ recorded: true });
};
