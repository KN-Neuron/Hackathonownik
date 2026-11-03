import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { appConfig, getCategory } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import { getCategoryRanking } from '$lib/server/ranking';
import { getRatingProgress } from '$lib/server/results';

// Printable jury protocol of one category (rules §8: signed by every juror of the category)
export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}

	const category = getCategory(url.searchParams.get('category'));
	if (!category) throw error(404, 'Unknown category');

	const [ranking, progress] = await Promise.all([
		getCategoryRanking(category.key),
		getRatingProgress()
	]);
	const juries = progress[category.key]?.juries ?? [];

	// Every juror's scores for every ranked team
	const pb = await getAdminClient();
	const teamIds = ranking.rankings.map((r) => r.teamId);
	const ratings = teamIds.length
		? await pb.collection('ratings').getFullList({
				filter: teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || '),
				fields: 'jury,team,scores'
			})
		: [];

	return {
		event: `${appConfig.event.name} ${appConfig.event.year}`,
		category: { key: category.key, name: category.name },
		ranking,
		juries: juries.map((j) => ({ id: j.id, name: j.name })),
		scores: ratings.map((r) => ({ jury: r.jury, team: r.team, scores: r.scores ?? {} })),
		generatedAt: new Date().toISOString()
	};
};
