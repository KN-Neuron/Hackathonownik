import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HttpStatusCode } from '$lib/utils/utils';
import { appConfig } from '$lib/server/appConfig';

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

		// Calculate dynamic final grade
		let finalGrade = 0;
		const updateData: any = {
			comments: data.comments || ''
		};

		appConfig.event.rating_criteria.forEach((criterion) => {
			const value = Number(data[criterion.key]) || 0;
			finalGrade += value;
			updateData[criterion.key] = value;
		});

		updateData.finalGrade = finalGrade;

		await locals.pb.collection('ratings').update(data.ratingId, updateData);

		return json({ success: true, message: 'Rating updated successfully' });
	} catch (err: any) {
		console.error('Error updating rating:', err);
		return json(
			{ success: false, message: err.message || 'Failed to update rating' },
			{ status: HttpStatusCode.InternalServerError }
		);
	}
};
