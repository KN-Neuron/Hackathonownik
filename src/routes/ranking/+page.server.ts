import { pbError } from '$lib/pocketbase.svelte';
import type { Rating } from '$lib/types';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check access based on user role
	// Juries can always see rankings, participants only when all teams are rated
	if (locals.user.role === 'participant' || locals.user.team) {
		// For participants, check if all presentations have been rated by at least one jury
		// We'll follow the same logic as in hooks.server.ts
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

			const presentationIds = presentations.map((p) => p.id);
			const ratedPresentationIds = new Set(ratings.map((r) => r.presentation));

			// If not all presentations have been rated yet, don't show rankings to participants
			if (!presentationIds.every((id) => ratedPresentationIds.has(id))) {
				throw redirect(303, '/upload');  // Redirect participant back to upload page
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

		const processedRatings = ratingsFromDB.map((r) => ({
			...r,
			jury: r.expand?.jury?.name || 'Unknown Jury',
			juryId: r.jury,
			team: r.expand?.team?.name || 'Unknown Team',
			teamId: r.expand?.team?.id || '',
			finalGrade: (r.innovation + r.usefulness + r.finalPresentation + r.implementation) / 4
		}));

		// Organize ratings by team
		const teamRatingsMap = new Map();

		for (const rating of processedRatings) {
			// Skip ratings from non-jury users
			if (!validJuryIds.has(rating.juryId)) {
				continue;
			}

			if (!teamRatingsMap.has(rating.teamId)) {
				teamRatingsMap.set(rating.teamId, {
					team: rating.team,
					teamId: rating.teamId,
					innovation: 0,
					usefulness: 0,
					implementation: 0,
					finalPresentation: 0,
					finalGrade: 0,
					ratingCount: 0,
					juryIds: new Set()
				});
			}

			const team = teamRatingsMap.get(rating.teamId);

			// If we haven't counted this jury yet for this team
			if (!team.juryIds.has(rating.juryId)) {
				team.juryIds.add(rating.juryId);
				team.ratingCount++;

				team.innovation += rating.innovation;
				team.usefulness += rating.usefulness;
				team.implementation += rating.implementation;
				team.finalPresentation += rating.finalPresentation;
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

			team.innovation /= count;
			team.usefulness /= count;
			team.implementation /= count;
			team.finalPresentation /= count;
			team.finalGrade =
				team.innovation + team.usefulness + team.implementation + team.finalPresentation;

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
