import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { pbError } from '$lib/pocketbase.svelte';
import { HttpStatusCode, Role } from '$lib/utils/utils';
import type { Rating, User } from '$lib/types';

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

		const juriesResult = await pb.collection('users').getList(1, 100, {
			filter: 'role = "jury"'
		});
		const totalJuries = juriesResult.totalItems;

		
		const validJuryIds = new Set();
		juriesResult.items.forEach((user) => {
			validJuryIds.add(user.id);
		});

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


			const ratingsForTeam = await pb.collection('ratings').getList(1, 1000, {
				filter: `team="${team.id}"`,
				expand: 'jury'
			});


			const uniqueJuries = new Set();
			ratingsForTeam.items.forEach((rating) => {

				if (rating.jury && validJuryIds.has(rating.jury)) {
					uniqueJuries.add(rating.jury);
				}
			});
			const ratingsCount = uniqueJuries.size;


			const isRatedByCurrentJury = ratingsForTeam.items.some((r) => r.jury === locals.user.id);

			// Find current jury's rating to display in the card
			const currentJuryRating = ratingsForTeam.items.find((r) => r.jury === locals.user.id);

			teams.push({
				...team,
				presentationUrl,
				ratingsCount,
				isRatedByCurrentJury,
				totalJuries,
				// Add current jury's ratings for display
				innowacyjnosc: currentJuryRating?.innovation ?? null,
				uzytecznosc: currentJuryRating?.usefulness ?? null,
				prezentacja_koncowa: currentJuryRating?.finalPresentation ?? null,
				jakosc_implementacji: currentJuryRating?.implementation ?? null,
				ocena: currentJuryRating?.finalGrade ?? null
			});
		}
		return { teams, totalJuries };
	} catch (error) {
		console.error('Error fetching data:', error);
		return { teams: [], totalJuries: 0 };
	}
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user: User = locals.user;

		if (user.role !== Role.Jury && user.role !== Role.Admin) {
			throw error(403, 'Insufficient permissions to perform operation');
		}

		const form = Object.fromEntries(await request.formData()) as {
			innovation: number;
			usefulness: number;
			finalPresentation: number;
			implementation: number;
			comments: string;
			teamId: string;
		};

		const rating: Rating = {
			innovation: Number(form.innovation),
			usefulness: Number(form.usefulness),
			finalPresentation: Number(form.finalPresentation),
			implementation: Number(form.implementation),
			comments: form.comments,
			jury: user.id,
			team: form.teamId,
			finalGrade: null
		};

		rating.finalGrade =
			Number(rating.innovation) +
			Number(rating.usefulness) +
			Number(rating.finalPresentation) +
			Number(rating.implementation);

		function allFieldsValid(obj: Rating) {
			return Object.values(obj).every((value) => {
				return value !== null && value !== undefined;
			});
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
