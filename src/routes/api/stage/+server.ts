import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canJudgeCategory, isAdmin } from '$lib/server/access';
import { appConfig, getCategory } from '$lib/server/appConfig';
import { getResultsState, inPresentationOrder, setOnStage, stageOf } from '$lib/server/results';
import { getTeamSubmissions } from '$lib/server/submissions';

/**
 * Who is on stage in a category: ?category=<key>. Jurors of the category and admins poll it
 * every few seconds; serverTime lets clients run the timer without trusting their clock.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const category = url.searchParams.get('category');
	if (!locals.user || !canJudgeCategory(locals.user, category)) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const state = await getResultsState();
	const onStage = state.onStage[category!] ?? null;
	if (!onStage) return json({ onStage: null, serverTime: new Date().toISOString() });

	// Same numbering as the jury's list: among the finalists in the final
	const submissions = await getTeamSubmissions({ categories: [category!] });
	const finalists = state.finalists[category!] ?? [];
	const ordered = inPresentationOrder(
		stageOf(state, category!) === 'final'
			? submissions.filter((s) => finalists.includes(s.teamId))
			: submissions,
		state.orders[category!],
		(s) => s.teamId,
		(s) => s.teamName
	);
	const team = ordered.find((s) => s.teamId === onStage.teamId);

	return json({
		onStage: {
			...onStage,
			teamName: team?.teamName ?? 'Unknown team',
			order: team?.order ?? null
		},
		serverTime: new Date().toISOString()
	});
};

// Organizers drive the stage from the presenter mode: { category, teamId?, action }
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!isAdmin(locals.user)) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}
	const body = await request.json().catch(() => null);
	const category = typeof body?.category === 'string' ? body.category : '';
	if (!getCategory(category)) {
		return json({ error: 'Unknown category' }, { status: 400 });
	}

	const current = (await getResultsState()).onStage[category] ?? null;
	const durationSec = appConfig.event.stage_presentation_minutes * 60;

	switch (body?.action) {
		case 'show':
			if (typeof body.teamId !== 'string') {
				return json({ error: 'teamId is required' }, { status: 400 });
			}
			await setOnStage(category, { teamId: body.teamId, startedAt: null, durationSec });
			break;
		case 'start':
			if (!current) return json({ error: 'Nobody is on stage' }, { status: 409 });
			await setOnStage(category, { ...current, startedAt: new Date().toISOString() });
			break;
		case 'reset':
			if (!current) return json({ error: 'Nobody is on stage' }, { status: 409 });
			await setOnStage(category, { ...current, startedAt: null });
			break;
		case 'clear':
			await setOnStage(category, null);
			break;
		default:
			return json({ error: 'Unknown action' }, { status: 400 });
	}
	return json({ success: true });
};
