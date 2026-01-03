import { pbError } from '$lib/pocketbase.svelte';
import type { Rating } from '$lib/types';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { appConfig } from '$lib/server/appConfig';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check access based on user role
	// Juries can always see rankings, participants only when all teams are rated AND confirmed
	if (locals.user.role === 'participant' || locals.user.team) {
		// For participants, check if all presentations have been rated by at least one jury
		// and all juries have confirmed their ratings
		try {
			const presentations = await locals.pb.collection('presentations').getFullList();
			if (presentations.length === 0) {
				// No presentations, so no rankings to show
				return {
					rankings: [],
					totalJuries: 0
				};
			}

			const ratings = await locals.pb.collection('ratings').getFullList();
			if (ratings.length === 0) {
				// No ratings yet, so don't show rankings to participants
				throw redirect(303, '/upload');  // Redirect participant back to upload page
			}

			// Get unique team IDs from presentations (to handle multiple presentations for same team)
			const uniqueTeamIds = new Set();
			for (const pres of presentations) {
				if (pres.team && !uniqueTeamIds.has(pres.team)) {
					uniqueTeamIds.add(pres.team);
				}
			}

			// Get unique team IDs that have been rated
			const ratedTeamIds = new Set(ratings.map((r: any) => r.team));

			// If not all teams have been rated yet, don't show rankings to participants
			if (Array.from(uniqueTeamIds).some((teamId) => !ratedTeamIds.has(teamId))) {
				throw redirect(303, '/upload');  // Redirect participant back to upload page
			}

			// Check if all juries have confirmed their ratings
			const juries = await locals.pb.collection('users').getFullList({
				filter: 'role = "jury"'
			});

			if (juries.length > 0) {
				const confirmedJuries = juries.filter((jury) => jury.confirmedRating === true);
				if (confirmedJuries.length !== juries.length) {
					// Not all juries have confirmed their ratings
					throw redirect(303, '/upload');  // Redirect participant back to upload page
				}
			}
		} catch (err) {
			console.error('Error checking ratings status:', err);
			throw redirect(303, '/upload');
		}
	}
	// Juries and admins can always access rankings

	try {
		const juriesResult = await locals.pb.collection('users').getList(1, 100, {
			filter: 'role = "jury"'
		});
		const totalJuries = juriesResult.totalItems;

		const validJuryIds = new Set();
		juriesResult.items.forEach((user) => {
			validJuryIds.add(user.id);
		});

		const ratingsFromDB = await locals.pb.collection('ratings').getFullList({
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
