import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Get all jury members
		const juries = await locals.pb.collection('users').getFullList({
			filter: 'role = "jury"'
		});

		if (juries.length === 0) {
			return json({
				allConfirmed: false,
				confirmedCount: 0,
				totalJuries: 0
			});
		}

		// Count how many have confirmed
		const confirmedJuries = juries.filter((jury) => jury.confirmedRating === true);

		return json({
			allConfirmed: confirmedJuries.length === juries.length,
			confirmedCount: confirmedJuries.length,
			totalJuries: juries.length
		});
	} catch (err) {
		console.error('Error checking jury confirmations:', err);
		throw error(500, 'Failed to check jury confirmations');
	}
};
