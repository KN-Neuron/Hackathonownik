import { json } from '@sveltejs/kit';
import { canSeeResults } from '$lib/server/access';
import { pbError } from '$lib/pocketbase.svelte';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	if (!(await canSeeResults(locals))) {
		return json({ error: 'Results are not public yet' }, { status: 403 });
	}

	const teamId = url.searchParams.get('teamId');

	if (!teamId) {
		return json({ error: 'Team ID is required' }, { status: 400 });
	}

	try {
		const ratingsList = await locals.pb.collection('ratings').getList(1, 100, {
			filter: locals.pb.filter('team = {:team}', { team: teamId }),
			sort: '-created',
			expand: 'jury'
		});

		const formattedRatings = ratingsList.items.map((rating) => {
			return {
				...rating,
				juryName: rating.expand?.jury?.name || 'Unknown Jury'
			};
		});

		return json({ ratings: formattedRatings });
	} catch (err) {
		console.error('Error fetching rating history:', err);
		return json({ error: 'Failed to fetch rating history' }, { status: 500 });
	}
};
