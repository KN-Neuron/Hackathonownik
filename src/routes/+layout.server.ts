import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	let teamCategory: string | null = null;

	// If user is a participant with a team, fetch the team's category
	if (locals.user?.team && locals.pb) {
		try {
			const team = await locals.pb.collection('teams').getOne(locals.user.team);
			teamCategory = team.category || null;
		} catch (err) {
			// Team not found or error - ignore
			console.error('Error fetching team category:', err);
		}
	}

	return {
		user: locals.user,
		csrfToken: locals.csrfToken,
		teamCategory
	};
};
