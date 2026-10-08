import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { appConfig } from '$lib/server/appConfig';
import { isAdmin } from '$lib/server/access';
import { getResultsState, inPresentationOrder, stageOf } from '$lib/server/results';
import { getTeamSubmissions } from '$lib/server/submissions';

// Presenter mode for the stage laptop: organizers show each team's slides with a timer
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!isAdmin(locals.user)) throw error(403, 'Admin access required');

	const categories = appConfig.event.categories.map((c) => c.key);
	const requested = url.searchParams.get('category');
	const category = requested && categories.includes(requested) ? requested : categories[0];

	const [submissions, state] = await Promise.all([
		getTeamSubmissions({ categories: [category] }),
		getResultsState()
	]);
	const stage = stageOf(state, category);
	const finalists = state.finalists[category] ?? [];
	const teams = inPresentationOrder(
		stage === 'final' ? submissions.filter((s) => finalists.includes(s.teamId)) : submissions,
		state.orders[category],
		(s) => s.teamId,
		(s) => s.teamName
	).map((s) => ({
		teamId: s.teamId,
		teamName: s.teamName,
		order: s.order,
		presentationUrl: s.presentation?.url ?? null,
		finalPresentationUrl: s.final_presentation?.url ?? null
	}));

	return {
		categories,
		category,
		stage,
		teams,
		onStage: state.onStage[category] ?? null,
		minutes: appConfig.event.stage_presentation_minutes
	};
};
