import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canJudgeCategory } from '$lib/server/access';
import { getRatingProgress, getResultsState } from '$lib/server/results';
import { setCategoryConfirmed } from '$lib/server/confirmations';

// Confirm (or withdraw) the logged-in juror's ratings of one category: { category, confirmed }
export const POST: RequestHandler = async ({ locals, request }) => {
	const body = await request.json().catch(() => null);
	const category = typeof body?.category === 'string' ? body.category : null;
	const confirmed = body?.confirmed === true;

	if (!locals.user || !canJudgeCategory(locals.user, category)) {
		return json({ success: false, message: 'Not authorized' }, { status: 403 });
	}

	try {
		if ((await getResultsState()).publishedCategories.includes(category!)) {
			return json(
				{ success: false, message: 'Results of this category are already published.' },
				{ status: 409 }
			);
		}

		// Confirming means "all my ratings are final", so every team must be rated first
		if (confirmed) {
			const progress = (await getRatingProgress())[category!];
			const me = progress?.juries.find((j) => j.id === locals.user!.id);
			const rated = me?.ratedTeams ?? 0;
			if (!progress || rated < progress.totalTeams) {
				return json(
					{
						success: false,
						message: `You have rated ${rated} of ${progress?.totalTeams ?? 0} teams.`
					},
					{ status: 400 }
				);
			}
		}

		await setCategoryConfirmed(locals.user.id, category!, confirmed);
		return json({ success: true, confirmed });
	} catch (err) {
		console.error('Error updating confirmation status:', err);
		return json({ success: false, message: 'Failed to update confirmation' }, { status: 500 });
	}
};
