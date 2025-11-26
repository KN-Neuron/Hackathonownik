import { json } from '@sveltejs/kit';
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
		const ratingsList = await locals.pb.collection('ratings').getList(1, 100, {
			filter: `team = "${teamId}"`,
			sort: '-created',
			expand: 'jury'
		});

		const formattedRatings = ratingsList.items.map((rating) => {
			const finalGrade =
				Number(rating.innovation) +
				Number(rating.usefulness) +
				Number(rating.finalPresentation) +
				Number(rating.implementation);
			return {
				id: rating.id,
				juryId: rating.jury,
				juryName: rating.expand?.jury?.name || 'Unknown Jury',
				innovation: Number(rating.innovation),
				usefulness: Number(rating.usefulness),
				finalPresentation: Number(rating.finalPresentation),
				implementation: Number(rating.implementation),
				comments: rating.comments || '',
				finalGrade,
				created: rating.created
			};
		});

		return json({ ratings: formattedRatings });
	} catch (err) {
		console.error('Error fetching team rating details:', err);
		return json({ error: 'Failed to fetch rating details' }, { status: 500 });
	}
};
