import { env } from '$env/dynamic/private';
import PocketBase from 'pocketbase';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	try {
		const pb = locals.pb || new PocketBase(env.PUBLIC_POCKETBASE_URL);

		const records = await pb.collection('teams').getFullList({
			sort: '-name'
		});

		return {
			teams: records
		};
	} catch (error) {
		console.error('Error fetching teams:', error);
		return {
			teams: []
		};
	}
};
