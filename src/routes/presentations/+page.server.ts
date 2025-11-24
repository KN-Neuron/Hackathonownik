import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check if user is a jury member or admin
	if (locals.user.role !== 'jury' && locals.user.role !== 'admin' && !locals.user.admin) {
		throw redirect(303, '/');
	}

	// Get all presentations from PocketBase, sorted by creation time (newest first)
	try {
		const allPresentations = await locals.pb.collection('presentations').getFullList({
			sort: '-created',
			expand: 'team'
		});

		// Group presentations by team and keep only the newest one for each team
		const newestPresentationsMap = new Map();
		for (const presentation of allPresentations) {
			const teamId = presentation.team;
			// Only store the first (newest) presentation for each team
			if (!newestPresentationsMap.has(teamId)) {
				newestPresentationsMap.set(teamId, presentation);
			}
		}

		// Convert map values to array
		const newestPresentations = Array.from(newestPresentationsMap.values());

		// Format the presentations data for the frontend with API endpoint URLs for secure access
		const formattedPresentations = newestPresentations.map(presentation => ({
			id: presentation.id,
			teamName: presentation.expand?.team?.name || 'Unknown Team',
			teamId: presentation.expand?.team?.id,
			category: presentation.expand?.team?.category || 'wellness',
			created: presentation.created,
			updated: presentation.updated,
			repo_link: presentation.repo_link || null,
			video_link: presentation.video_link || null,
			// Use our secure API endpoint to access the presentation file
			presentationUrl: `/api/presentations/${presentation.id}`
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