import { json } from '@sveltejs/kit';
import { canSeeResults, isJuryOrAdmin, resultsClient } from '$lib/server/access';
import type { RequestHandler } from './$types';
import { appConfig } from '$lib/server/appConfig';

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

	// Feedback is meant for the rated team only
	const showFeedback = isJuryOrAdmin(locals.user) || locals.user.team === teamId;

	try {
		const pb = await resultsClient(locals);
		const ratingsList = await pb.collection('ratings').getList(1, 100, {
			filter: pb.filter('team = {:team}', { team: teamId }),
			sort: '-created',
			expand: 'jury'
		});

		const formattedRatings = ratingsList.items.map((rating) => {
			let finalGrade = 0;
			const ratingData: any = {
				id: rating.id,
				juryId: rating.jury,
				juryName: rating.expand?.jury?.name || 'Unknown Jury',
				comments: showFeedback ? rating.comments || '' : '',
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
