import { json } from '@sveltejs/kit';
import { canSeeResults, getTeamCategory, isJuryOrAdmin, resultsClient } from '$lib/server/access';
import { criteriaFor } from '$lib/server/appConfig';
import type { RequestHandler } from './$types';

// Every jury rating of one team: ?teamId=<id>
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	const teamId = url.searchParams.get('teamId');
	if (!teamId) {
		return json({ error: 'Team ID is required' }, { status: 400 });
	}

	// The team's category decides who may see its results, not anything the client sends
	const category = await getTeamCategory(teamId);
	if (!(await canSeeResults(locals, category))) {
		return json({ error: 'Results are not public yet' }, { status: 403 });
	}

	// Feedback is meant for the rated team only
	const showFeedback = isJuryOrAdmin(locals.user) || locals.user.team === teamId;
	const criteria = criteriaFor(category);

	try {
		const pb = await resultsClient();
		const ratings = await pb.collection('ratings').getFullList({
			filter: pb.filter('team = {:team}', { team: teamId }),
			sort: '-created',
			expand: 'jury'
		});

		return json({
			criteria,
			ratings: ratings.map((rating) => {
				const scores = Object.fromEntries(
					criteria.map((c) => [c.key, Number(rating.scores?.[c.key]) || 0])
				);
				return {
					id: rating.id,
					juryName: rating.expand?.jury?.name || 'Unknown Jury',
					comments: showFeedback ? rating.comments || '' : '',
					created: rating.created,
					scores,
					finalGrade: Object.values(scores).reduce((a, b) => a + b, 0)
				};
			})
		});
	} catch (err) {
		console.error('Error fetching team rating details:', err);
		return json({ error: 'Failed to fetch rating details' }, { status: 500 });
	}
};
