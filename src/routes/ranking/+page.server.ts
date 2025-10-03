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
		const ratingsFromDB: any[] = await locals.pb.collection('ratings').getFullList({
			sort: '-created',
			expand: 'jury,team'
		});

		const ratings: Rating[] = ratingsFromDB.map((r) => ({
			...r,
			jury: r.expand.jury.name,
			team: r.expand.team.name,
			finalGrade: calculateFinalGrade(r)
		}));

		const uniqueTeamRatings: Rating[] = [];
		const uniqueJuryTeamPairs = new Set<string>();
		for (const rating of ratings) {
			const juryTeamKey = `${rating.jury}:${rating.team}`;
			if (!uniqueJuryTeamPairs.has(juryTeamKey)) {
				uniqueJuryTeamPairs.add(juryTeamKey);
				uniqueTeamRatings.push(rating);
			}
		}

		const ratingsByTeam = new Map<string, Rating[]>();
		for (const rating of uniqueTeamRatings) {
			if (!ratingsByTeam.has(rating.team)) {
				ratingsByTeam.set(rating.team, []);
			}
			ratingsByTeam.get(rating.team)!.push(rating);
		}

		const finalTeamRatings: Rating[] = [];
		for (const [teamName, teamRatingsList] of ratingsByTeam.entries()) {
			const numRatingsForThisTeam = teamRatingsList.length;

			const totalRating: Rating = {
				team: teamName,
				jury: 'Aggregated',
				innovation: 0,
				usefulness: 0,
				implementation: 0,
				finalPresentation: 0,
				finalGrade: 0
			};

			for (const rating of teamRatingsList) {
				totalRating.innovation += rating.innovation;
				totalRating.usefulness += rating.usefulness;
				totalRating.implementation += rating.implementation;
				totalRating.finalPresentation += rating.finalPresentation;
			}

			const finalRating: Rating = {
				team: teamName,
				jury: 'Aggregated',
				innovation: totalRating.innovation / numRatingsForThisTeam,
				usefulness: totalRating.usefulness / numRatingsForThisTeam,
				implementation: totalRating.implementation / numRatingsForThisTeam,
				finalPresentation: totalRating.finalPresentation / numRatingsForThisTeam,
				finalGrade: 0
			};

			finalRating.finalGrade = calculateFinalGrade(finalRating);

			finalTeamRatings.push(finalRating);
		}

		return {
			ratings: finalTeamRatings.sort((a, b) => b.finalGrade - a.finalGrade) || []
		};
	} catch (err: unknown) {
		console.error('Error processing ratings:', err);
		pbError(err);
		return {
			ratings: []
		};
	}
};
