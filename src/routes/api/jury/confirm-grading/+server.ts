import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Role } from '$lib/utils/utils';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || (locals.user.role !== Role.Jury && locals.user.role !== Role.Admin)) {
		throw error(403, 'Unauthorized');
	}

	try {
		const { confirmed } = await request.json();

		// Update the user's confirmedRating field
		await locals.pb.collection('users').update(locals.user.id, {
			confirmedRating: confirmed
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
