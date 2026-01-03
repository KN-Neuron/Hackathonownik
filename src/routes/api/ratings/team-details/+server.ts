import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appConfig } from '$lib/server/appConfig';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	const teamId = url.searchParams.get('teamId');

	if (!teamId) {
		return json({ error: 'Team ID is required' }, { status: 400 });
	}

	try {
		const ratingsList = await locals.pb.collection('ratings').getList(1, 100, {
			filter: `team = "${teamId}"`,
			sort: '-created',
			expand: 'jury'
		});

		const formattedRatings = ratingsList.items.map((rating) => {
			let finalGrade = 0;
			const ratingData: any = {
				id: rating.id,
				juryId: rating.jury,
				juryName: rating.expand?.jury?.name || 'Unknown Jury',
				comments: rating.comments || '',
				created: rating.created
			};

			appConfig.event.rating_criteria.forEach((criterion) => {
				const value = Number(rating[criterion.key]) || 0;
				finalGrade += value;
				ratingData[criterion.key] = value;
			});

			ratingData.finalGrade = finalGrade;
			return ratingData;
		});

		return json({ ratings: formattedRatings });
	} catch (err) {
		console.error('Error fetching team rating details:', err);
		return json({ error: 'Failed to fetch rating details' }, { status: 500 });
	}
};
