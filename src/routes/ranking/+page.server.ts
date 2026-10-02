import { pbError } from '$lib/pocketbase.svelte';
import type { Rating } from '$lib/types';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { appConfig } from '$lib/server/appConfig';
import { canSeeResults, isJuryOrAdmin, resultsClient } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Admins always; jury once everyone confirmed; participants once an organizer publishes it
	if (!(await canSeeResults(locals))) {
		throw redirect(303, isJuryOrAdmin(locals.user) ? '/rate_presentation' : '/my-submission');
	}

	const pb = await resultsClient(locals);

	try {
		const juriesResult = await pb.collection('users').getList(1, 100, {
			filter: 'role = "jury"'
		});
		const totalJuries = juriesResult.totalItems;

		const validJuryIds = new Set();
		juriesResult.items.forEach((user) => {
			validJuryIds.add(user.id);
		});

		const ratingsFromDB = await pb.collection('ratings').getFullList({
			sort: '-created',
			expand: 'jury,team'
		});

		const processedRatings = ratingsFromDB.map((r) => {
			let finalGrade = 0;
			appConfig.event.rating_criteria.forEach((criterion) => {
				finalGrade += Number(r[criterion.key]) || 0;
			});

			return {
				...r,
				jury: r.expand?.jury?.name || 'Unknown Jury',
				juryId: r.jury,
				team: r.expand?.team?.name || 'Unknown Team',
				teamId: r.expand?.team?.id || '',
				category: r.expand?.team?.category || appConfig.event.categories[0]?.key || '',
				finalGrade
			};
		});

		// Organize ratings by team
		const teamRatingsMap = new Map();

		for (const rating of processedRatings) {
			// Skip ratings from non-jury users
			if (!validJuryIds.has(rating.juryId)) {
				continue;
			}

			if (!teamRatingsMap.has(rating.teamId)) {
				const teamInit: any = {
					team: rating.team,
					teamId: rating.teamId,
					category: rating.category,
					finalGrade: 0,
					ratingCount: 0,
					juryIds: new Set()
				};

				// Initialize all criteria to 0
				appConfig.event.rating_criteria.forEach((criterion) => {
					teamInit[criterion.key] = 0;
				});

				teamRatingsMap.set(rating.teamId, teamInit);
			}

			const team = teamRatingsMap.get(rating.teamId);

			// If we haven't counted this jury yet for this team
			if (!team.juryIds.has(rating.juryId)) {
				team.juryIds.add(rating.juryId);
				team.ratingCount++;

				// Add this jury's individual scores to team totals
				appConfig.event.rating_criteria.forEach((criterion) => {
					team[criterion.key] += rating[criterion.key] || 0;
				});
			}
		}

		const finalRankings = Array.from(teamRatingsMap.values()).map((team) => {
			const count = team.ratingCount;

			if (count === 0) {
				return {
					...team,
					status: 'provisional',
					completionPercent: 0
				};
			}

			// Keep sums instead of averages for metrics
			let finalGrade = 0;
			appConfig.event.rating_criteria.forEach((criterion) => {
				finalGrade += team[criterion.key];
			});
			team.finalGrade = finalGrade;

			team.status = count >= totalJuries ? 'final' : 'provisional';
			team.completionPercent = Math.round((count / totalJuries) * 100);

			return team;
		});

		finalRankings.sort((a, b) => b.finalGrade - a.finalGrade);

		return {
			rankings: finalRankings,
			totalJuries
		};
	} catch (err) {
		console.error('Error processing ratings:', err);
		pbError(err);
		return {
			rankings: [],
			totalJuries: 0
		};
	}
};
