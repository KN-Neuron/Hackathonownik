import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HttpStatusCode } from '$lib/utils/utils';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Not authenticated' }, { status: 401 });
	}

	try {
		const data = await request.json();

		if (!data.ratingId || !data.teamId) {
			return json(
				{ success: false, message: 'Missing required fields' },
				{ status: HttpStatusCode.BadRequest }
			);
		}

		// Calculate final grade
		const finalGrade =
			(Number(data.innovation) +
				Number(data.usefulness) +
				Number(data.finalPresentation) +
				Number(data.implementation)) /
			4;

		// Update the rating
		await locals.pb.collection('ratings').update(data.ratingId, {
			innovation: Number(data.innovation),
			usefulness: Number(data.usefulness),
			finalPresentation: Number(data.finalPresentation),
			implementation: Number(data.implementation),
			comments: data.comments || '',
			finalGrade
		});

		return json({ success: true, message: 'Rating updated successfully' });
	} catch (err: any) {
		console.error('Error updating rating:', err);
		return json(
			{ success: false, message: err.message || 'Failed to update rating' },
			{ status: HttpStatusCode.InternalServerError }
		);
	}
};
