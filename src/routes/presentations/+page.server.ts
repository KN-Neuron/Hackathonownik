import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamSubmissions } from '$lib/server/submissions';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check if user is a jury member or admin
	if (locals.user.role !== 'jury' && locals.user.role !== 'admin' && !locals.user.admin) {
		throw redirect(303, '/');
	}

	// Merge every team's partial uploads, so the jury sees the newest PDF, repo and video
	try {
		const submissions = await getTeamSubmissions(locals.pb);

		const formattedPresentations = submissions.map((submission) => ({
			id: submission.teamId,
			teamName: submission.teamName,
			teamId: submission.teamId,
			category: submission.category,
			updated: submission.lastUpdated,
			// Secure API endpoint of the newest PDF, null when the team hasn't uploaded one
			presentationUrl: submission.presentation?.url ?? null,
			repo_link: submission.repo?.url ?? null,
			video_link: submission.video?.url ?? null,
			submission
		}));

		return {
			presentations: formattedPresentations,
			user: locals.user
		};
	} catch (err) {
		console.error('Error fetching presentations:', err);
		return {
			presentations: [],
			user: locals.user
		};
	}
};
