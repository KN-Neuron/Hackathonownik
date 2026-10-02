import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { pbError } from '$lib/pocketbase.svelte';
import { HttpStatusCode, Role } from '$lib/utils/utils';
import type { Rating, TeamSubmission, User } from '$lib/types';
import { appConfig } from '$lib/server/appConfig';
import { getTeamSubmissions } from '$lib/server/submissions';

export interface TeamWithPresentationUrl {
	id: string;
	presentationUrl: string | null;
	submission: TeamSubmission;
	repo_link?: string | null;
	video_link?: string | null;
	ratingsCount?: number;
	isRatedByCurrentJury?: boolean;
	totalJuries?: number;
	name?: string; // for team name
	category?: string;
	finalGradeDisplay?: number | null;
	[key: string]: any; // for dynamic criteria
}

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	try {
		const pb = locals.pb;

		const juriesResult = await pb.collection('users').getList(1, 100, {
			filter: 'role = "jury"'
		});
		const totalJuries = juriesResult.totalItems;

		const validJuryIds = new Set();
		juriesResult.items.forEach((user) => {
			validJuryIds.add(user.id);
		});

		// Get current jury's confirmation status
		const currentUser = await pb.collection('users').getOne(locals.user.id);
		const currentJuryConfirmed = currentUser.confirmedRating || false;

		const teams: TeamWithPresentationUrl[] = [];

		// Merge partial uploads so the jury sees the newest PDF, repo and video of each team
		const [submissions, allRatings] = await Promise.all([
			getTeamSubmissions(pb),
			pb.collection('ratings').getFullList()
		]);

		const ratingsByTeam = new Map<string, typeof allRatings>();
		for (const rating of allRatings) {
			const list = ratingsByTeam.get(rating.team) ?? [];
			list.push(rating);
			ratingsByTeam.set(rating.team, list);
		}

		for (const submission of submissions) {
			const ratingsForTeam = ratingsByTeam.get(submission.teamId) ?? [];

			const uniqueJuries = new Set();
			ratingsForTeam.forEach((rating) => {
				if (rating.jury && validJuryIds.has(rating.jury)) {
					uniqueJuries.add(rating.jury);
				}
			});
			const ratingsCount = uniqueJuries.size;

			// Find current jury's rating to display in the card
			const currentJuryRating = ratingsForTeam.find((r) => r.jury === locals.user.id);

			const teamData: TeamWithPresentationUrl = {
				id: submission.teamId,
				name: submission.teamName,
				category: submission.category,
				presentationUrl: submission.presentation?.url ?? null,
				repo_link: submission.repo?.url ?? null,
				video_link: submission.video?.url ?? null,
				submission,
				ratingsCount,
				isRatedByCurrentJury: Boolean(currentJuryRating),
				totalJuries,
				finalGradeDisplay: currentJuryRating?.finalGrade ?? null
			};

			// Add current jury's individual ratings dynamically
			appConfig.event.rating_criteria.forEach((criterion) => {
				teamData[criterion.key] = currentJuryRating?.[criterion.key] ?? null;
			});

			teams.push(teamData);
		}
		return { teams, totalJuries, currentJuryConfirmed };
	} catch (error) {
		console.error('Error fetching data:', error);
		return { teams: [], totalJuries: 0, currentJuryConfirmed: false };
	}
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user: User = locals.user;

		if (user.role !== Role.Jury && user.role !== Role.Admin) {
			throw error(403, 'Insufficient permissions to perform operation');
		}

		const formData = await request.formData();
		const form = Object.fromEntries(formData);

		const rating: Rating = {
			comments: form.comments as string,
			jury: user.id,
			team: form.teamId as string,
			finalGrade: 0
		};

		let finalGrade = 0;
		appConfig.event.rating_criteria.forEach((criterion) => {
			const value = Number(form[criterion.key]) || 0;
			rating[criterion.key] = value;
			finalGrade += value;
		});
		rating.finalGrade = finalGrade;

		function allFieldsValid(obj: Rating) {
			// Check if all criteria are present
			return appConfig.event.rating_criteria.every(
				(c) => obj[c.key] !== undefined && obj[c.key] !== null
			);
		}

		try {
			if (allFieldsValid(rating)) {
				const existingRatings = await locals.pb.collection('ratings').getList(1, 1, {
					filter: `jury = "${user.id}" && team = "${form.teamId}"`
				});

				if (existingRatings.totalItems > 0) {
					await locals.pb.collection('ratings').update(existingRatings.items[0].id, rating);
				} else {
					await locals.pb.collection('ratings').create(rating);
				}
			}
		} catch (err: unknown) {
			console.error('Error in action:', err);
			pbError(err);
			throw error(HttpStatusCode.InternalServerError, 'Failed to create rating');
		}

		throw redirect(HttpStatusCode.SeeOther, '/rate_presentation');
	}
};
