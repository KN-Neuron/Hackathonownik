import { appConfig } from '$lib/server/appConfig';
import { visibleResultCategories } from '$lib/server/access';
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
		// Ranking link: at least one category whose results this user may see
		rankingVisible: locals.user ? (await visibleResultCategories(locals)).length > 0 : false,
		eventConfig: appConfig.event
	};
};
