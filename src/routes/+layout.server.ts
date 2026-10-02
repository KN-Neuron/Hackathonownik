import { appConfig } from '$lib/server/appConfig';
import { getResultsState } from '$lib/server/results';
import { canSeeResults } from '$lib/server/access';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	let teamCategory: string | null = null;

	if (locals.user?.team && locals.pb) {
		try {
			const team = await locals.pb.collection('teams').getOne(locals.user.team);
			teamCategory = team.category || null;
		} catch (err) {
			console.error('Error fetching team category:', err);
		}
	}

	return {
		user: locals.user,
		csrfToken: locals.csrfToken,
		teamCategory,
		resultsPublished: locals.user ? (await getResultsState()).published : false,
		rankingVisible: locals.user ? await canSeeResults(locals) : false,
		eventConfig: appConfig.event
	};
};
