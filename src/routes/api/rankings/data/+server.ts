import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

		const processedRatings = ratingsFromDB.map((r) => ({
			...r,
			jury: r.expand?.jury?.name || 'Unknown Jury',
			juryId: r.jury,
			team: r.expand?.team?.name || 'Unknown Team',
			teamId: r.expand?.team?.id || '',
			finalGrade: r.innovation + r.usefulness + r.finalPresentation + r.implementation
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

			// Calculate final grade as the sum of all individual scores across all juries
			team.finalGrade =
				team.innovation + team.usefulness + team.implementation + team.finalPresentation;

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
