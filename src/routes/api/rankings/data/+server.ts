import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appConfig } from '$lib/server/appConfig';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

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

			// Calculate final grade as the sum of all individual scores across all juries
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

		return json({
			rankings: finalRankings,
			totalJuries
		});
	} catch (err) {
		console.error('Error processing ratings:', err);
		return json({ error: 'Failed to retrieve rankings' }, { status: 500 });
	}
};
