import { json } from '@sveltejs/kit';
import { canSeeResults } from '$lib/server/access';
import { getCategoryRanking } from '$lib/server/ranking';
import type { RequestHandler } from './$types';

// Ranking of one category: ?category=<key>
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	const category = url.searchParams.get('category');
	if (!(await canSeeResults(locals, category))) {
		return json({ error: 'Results are not public yet' }, { status: 403 });
	}

	try {
		return json(await getCategoryRanking(category!));
	} catch (err) {
		console.error('Error processing ratings:', err);
		return json({ error: 'Failed to retrieve rankings' }, { status: 500 });
	}
};
