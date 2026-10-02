import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Role } from '$lib/utils/utils';
import { getRatingProgress, getResultsState } from '$lib/server/results';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || (locals.user.role !== Role.Jury && locals.user.role !== Role.Admin)) {
		throw error(403, 'Unauthorized');
	}

	try {
		const { confirmed } = await request.json();

		if ((await getResultsState()).published) {
			return json(
				{ success: false, message: 'Results are already published.' },
				{ status: 409 }
			);
		}

		// Confirming means "all my ratings are final", so every team must be rated first
		if (confirmed) {
			const progress = await getRatingProgress(locals.pb);
			const me = progress.juries.find((j) => j.id === locals.user!.id);
			if (me && me.ratedTeams < progress.totalTeams) {
				return json(
					{
						success: false,
						message: `You have rated ${me.ratedTeams} of ${progress.totalTeams} teams.`
					},
					{ status: 400 }
				);
			}
		}

		// Update the user's confirmedRating field
		await locals.pb.collection('users').update(locals.user.id, {
			confirmedRating: confirmed === true
		});

		return json({ success: true, confirmed });
	} catch (err) {
		console.error('Error updating confirmation status:', err);
		throw error(500, 'Failed to update confirmation status');
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Get current user's confirmation status
		const user = await locals.pb.collection('users').getOne(locals.user.id);

		return json({
			confirmed: user.confirmedRating || false
		});
	} catch (err) {
		console.error('Error fetching confirmation status:', err);
		throw error(500, 'Failed to fetch confirmation status');
	}
};
