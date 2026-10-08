import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamSubmission } from '$lib/server/submissions';
import { getResultsState, getTeamFeedback } from '$lib/server/results';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (locals.user.role === 'jury' || locals.user.role === 'admin' || locals.user.admin) {
		throw redirect(303, '/presentations');
	}

	const teamId = locals.user.team;
	if (!teamId) {
		return {
			submission: null,
			error: 'You are not associated with any team. Ask the organizers to add you to your team.'
		};
	}

	try {
		const [submission, { published }] = await Promise.all([
			getTeamSubmission(locals.pb, teamId),
			getResultsState()
		]);
		return {
			submission,
			// Feedback from the jury reaches the team only after results are published
			feedback: published ? await getTeamFeedback(teamId) : null,
			error: null
		};
	} catch (err) {
		console.error('Error fetching team submission:', err);
		return {
			submission: null,
			error: 'An error occurred while fetching your submission.'
		};
	}
};
