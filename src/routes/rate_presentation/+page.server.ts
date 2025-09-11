import { env } from '$env/dynamic/private';

import { redirect } from '@sveltejs/kit';

export interface TeamWithPresentationUrl {
	collectionId: string;
	collectionName: string;
	created: string;
	id: string;
	team: string;
	updated: string;
	presentationUrl: string | null;
}

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	try {
		const pb = locals.pb;
		const teams: TeamWithPresentationUrl[] = [];
		const presentations = await pb.collection('presentations').getFullList({ sort: '-created' });

		const newestPresentations = [];
		const uniqueTeams = new Set();
		for (const pres of presentations) {
			if (pres.team && !uniqueTeams.has(pres.team)) {
				newestPresentations.push(pres);
				uniqueTeams.add(pres.team);
			}
		}

		for (const pres of newestPresentations) {
			const team = await pb.collection('teams').getOne(pres.team);

			const presentationUrl = pres.presentation
				? `https://frog01-32147.wykr.es/api/files/${pres.collectionName}/${pres.id}/${pres.presentation}`
				: null;

			teams.push({
				...team,
				presentationUrl
			});
		}
		return { teams };
	} catch (error) {
		console.error('Error fetching data:', error);
		return { teams: [] };
	}
};
