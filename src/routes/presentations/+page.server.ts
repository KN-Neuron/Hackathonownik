import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamSubmissions } from '$lib/server/submissions';
import { isJuryOrAdmin, juryCategories } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!isJuryOrAdmin(locals.user)) {
		throw redirect(303, '/');
	}

	// Jurors see only their categories, admins all of them
	const categories = juryCategories(locals.user);
	const requested = url.searchParams.get('category');
	const category =
		requested && categories.includes(requested) ? requested : (categories[0] ?? null);

	try {
		const submissions = category ? await getTeamSubmissions({ categories: [category] }) : [];

		const sorted = [...submissions].sort((a, b) => a.teamName.localeCompare(b.teamName));
		const formattedPresentations = sorted.map((submission) => ({
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

		return { categories, category, presentations: formattedPresentations };
	} catch (err) {
		console.error('Error fetching presentations:', err);
		return { categories, category, presentations: [] };
	}
};
