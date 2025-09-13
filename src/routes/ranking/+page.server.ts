import { pbError } from '$lib/pocketbase.svelte';
import type { Rating } from '$lib/types';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

function calculateFinalGrade(rating: Rating): number {
	const result =
		(rating.usefulness + rating.finalPresentation + rating.implementation + rating.innovation) / 4;
	return result;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	try {
		const ratings: Rating[] = await locals.pb.collection('ratings').getFullList({
			sort: '-created'
		});

		console.log('Fetched ratings:', ratings);
		console.log('Number of ratings:', ratings.length);

		if (ratings.length > 0) {
			console.log('First rating structure:', Object.keys(ratings[0]));
		}
		const uniqueTeamRatings: Rating[] = [];
		const uniqueTeamsAndJury = new Set();

		for (const rating of ratings) {
			const juryTeam = `${rating.jury}:${rating.team}`;

			if (!uniqueTeamsAndJury.has(juryTeam)) {
				rating.finalGrade = calculateFinalGrade(rating);
				const juryUser = await locals.pb.collection('users').getOne(rating.jury);
				const teamData = await locals.pb.collection('teams').getOne(rating.team);

				rating.jury = juryUser.name;
				rating.team = teamData.name;
				uniqueTeamRatings.push(rating);
			}

			uniqueTeamsAndJury.add(juryTeam);
		}
		console.log(uniqueTeamsAndJury);

		return {
			ratings: uniqueTeamRatings || []
		};
	} catch (err: unknown) {
		console.error('Error fetching ratings:', err);
		pbError(err);
		return {
			ratings: []
		};
	}
};
