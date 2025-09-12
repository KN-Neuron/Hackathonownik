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
			notes: form.comments,
			jury: user.id,
			team: form.teamId
		};

		// TODO handle updating the was_graded for all jury
		function allFieldsValid(obj: Rating) {
			return Object.values(obj).every((value) => {
				return value !== null && value !== undefined;
			});
		}

		try {
			if (allFieldsValid(rating)) {
				await locals.pb.collection('ratings').create(rating);
			}
		} catch (err: unknown) {
			console.error('Error in action:', err);
			pbError(err);
			throw error(HttpStatusCode.InternalServerError, 'Failed to create rating');
		}

		throw redirect(HttpStatusCode.SeeOther, '/');
	}
};
