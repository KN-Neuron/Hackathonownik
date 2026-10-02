import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamSubmission } from '$lib/server/submissions';

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
		return {
			submission: await getTeamSubmission(locals.pb, teamId),
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
