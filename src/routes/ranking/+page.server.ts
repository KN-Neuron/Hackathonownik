import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamCategory, isJuryOrAdmin, visibleResultCategories } from '$lib/server/access';
import { getCategoryRanking } from '$lib/server/ranking';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Admins: all categories; jurors: theirs once all of its jurors confirmed; everyone: published
	const categories = await visibleResultCategories(locals);
	if (categories.length === 0) {
		throw redirect(303, isJuryOrAdmin(locals.user) ? '/rate_presentation' : '/my-submission');
	}

	const requested = url.searchParams.get('category');
	// Participants start on their own team's category when it's visible
	const ownCategory = locals.user.team ? await getTeamCategory(locals.user.team) : null;
	const preferred = categories.find((key) => key === ownCategory);
	const category =
		requested && categories.includes(requested) ? requested : (preferred ?? categories[0]);

	try {
		return { categories, ...(await getCategoryRanking(category)) };
	} catch (err) {
		console.error('Error loading ranking:', err);
		return { categories, category, criteria: [], rankings: [], totalJuries: 0 };
	}
};
