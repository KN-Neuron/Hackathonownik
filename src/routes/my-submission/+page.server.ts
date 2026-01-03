import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { appConfig } from '$lib/server/appConfig';

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
			user: locals.user,
			error: 'You are not associated with any team.'
		};
	}

	try {
		const teamPresentations = await locals.pb.collection('presentations').getFullList({
			filter: `team = "${teamId}"`,
			sort: '-created',
			expand: 'team'
		});

		if (teamPresentations.length === 0) {
			return {
				submission: null,
				user: locals.user,
				error: 'No submissions found for your team.'
			};
		}

		const latestPresentation = teamPresentations[0];

		const formattedSubmission = {
			id: latestPresentation.id,
			teamName: latestPresentation.expand?.team?.name || 'Your Team',
			teamId: teamId,
			category: latestPresentation.expand?.team?.category || appConfig.event.categories[0]?.key || 'wellness',
			created: latestPresentation.created,
			updated: latestPresentation.updated,
			repo_link: latestPresentation.repo_link || null,
			video_link: latestPresentation.video_link || null,
			presentationUrl: `/api/presentations/${latestPresentation.id}`,
			allPresentations: teamPresentations.map((p) => ({
				id: p.id,
				created: p.created,
				updated: p.updated
			}))
		};

		return {
			submission: formattedSubmission,
			user: locals.user,
			error: null
		};
	} catch (err) {
		console.error('Error fetching team submission:', err);
		return {
			submission: null,
			user: locals.user,
			error: 'An error occurred while fetching your submission.'
		};
	}
};

