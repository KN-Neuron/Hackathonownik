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
		// Get all ratings for this team
		const ratingsList = await locals.pb.collection('ratings').getList(1, 100, {
			filter: `team = "${teamId}"`,
			sort: '-created',
			expand: 'jury'
		});

		// Format the ratings to include jury names
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
