import { json } from '@sveltejs/kit';
import { pbError } from '$lib/pocketbase.svelte';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	const teamId = url.searchParams.get('teamId');

	if (!teamId) {
		return json({ error: 'Team ID is required' }, { status: 400 });
	}

	try {
		// Check if this jury already rated this team
		const existingRatings = await locals.pb.collection('ratings').getList(1, 1, {
			filter: `jury = "${locals.user.id}" && team = "${teamId}"`,
			sort: '-created'
		});

		if (existingRatings.totalItems > 0) {
			return json({
				rating: existingRatings.items[0],
				found: true
			});
		}

		return json({ found: false });
	} catch (err) {
		console.error('Error fetching rating:', err);
		return json({ error: 'Failed to fetch rating' }, { status: 500 });
	}
};
