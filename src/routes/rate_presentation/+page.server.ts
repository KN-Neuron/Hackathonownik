import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { pbError } from '$lib/pocketbase.svelte';
import { HttpStatusCode } from '$lib/utils/utils';
import type { Rating, TeamSubmission, User } from '$lib/types';
import { criteriaFor } from '$lib/server/appConfig';
import { getTeamSubmissions } from '$lib/server/submissions';
import {
	canJudgeCategory,
	getTeamCategory,
	isJuryOrAdmin,
	juryCategories,
	resultsClient
} from '$lib/server/access';
import { parseScores } from '$lib/server/ratings';
import { getRatingProgress, getResultsState } from '$lib/server/results';
import { getJuryNotes } from '$lib/server/juryNotes';
import { setCategoryConfirmed } from '$lib/server/confirmations';

export interface TeamWithPresentationUrl {
	id: string;
	name: string;
	category: string;
	presentationUrl: string | null;
	repo_link: string | null;
	video_link: string | null;
	submission: TeamSubmission;
	ratingsCount: number;
	totalJuries: number;
	isRatedByCurrentJury: boolean;
	// Current juror's scores per criterion key
	scores: Record<string, number> | null;
	finalGradeDisplay: number | null;
	notes: string;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (!isJuryOrAdmin(locals.user)) {
		throw redirect(303, '/');
	}

	// Jurors only ever get the categories assigned to them
	const categories = juryCategories(locals.user);
	const requested = url.searchParams.get('category');
	const category = requested && categories.includes(requested) ? requested : categories[0];

	if (!category) {
		return {
			categories,
			category: null,
			teams: [],
			progress: {},
			confirmed: false,
			published: false
		};
	}

	try {
		const [submissions, progress, state, notes] = await Promise.all([
			getTeamSubmissions({ categories: [category] }),
			getRatingProgress(),
			getResultsState(),
			getJuryNotes(locals.user.id).catch((e) => {
				console.error('Error loading jury notes:', e);
				return {} as Record<string, string>;
			})
		]);

		const categoryProgress = progress[category];
		const juryIds = new Set(categoryProgress?.juries.map((j) => j.id) ?? []);

		const pb = await resultsClient();
		const teamIds = submissions.map((s) => s.teamId);
		const ratings = teamIds.length
			? await pb.collection('ratings').getFullList({
					filter: teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || '),
					fields: 'jury,team,scores,finalGrade'
				})
			: [];

		const teams: TeamWithPresentationUrl[] = submissions.map((submission) => {
			const forTeam = ratings.filter((r) => r.team === submission.teamId);
			const mine = forTeam.find((r) => r.jury === locals.user!.id);
			return {
				id: submission.teamId,
				name: submission.teamName,
				category: submission.category,
				presentationUrl: submission.presentation?.url ?? null,
				repo_link: submission.repo?.url ?? null,
				video_link: submission.video?.url ?? null,
				submission,
				// Only ratings of the category's jurors count
				ratingsCount: new Set(forTeam.filter((r) => juryIds.has(r.jury)).map((r) => r.jury)).size,
				totalJuries: juryIds.size,
				isRatedByCurrentJury: Boolean(mine),
				scores: mine?.scores ?? null,
				finalGradeDisplay: mine?.finalGrade ?? null,
				notes: notes[submission.teamId] ?? ''
			};
		});

		// Small summary for the category tabs
		const summary = Object.fromEntries(
			categories.map((key) => {
				const p = progress[key];
				const me = p?.juries.find((j) => j.id === locals.user!.id);
				return [
					key,
					{
						rated: me?.ratedTeams ?? 0,
						total: p?.totalTeams ?? 0,
						confirmed: me?.confirmed ?? false
					}
				];
			})
		);

		return {
			categories,
			category,
			teams,
			progress: summary,
			confirmed: summary[category]?.confirmed ?? false,
			published: state.publishedCategories.includes(category)
		};
	} catch (err) {
		console.error('Error fetching data:', err);
		return { categories, category, teams: [], progress: {}, confirmed: false, published: false };
	}
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = locals.user as User | null;

		if (!isJuryOrAdmin(user)) {
			throw error(403, 'Insufficient permissions to perform operation');
		}

		const formData = await request.formData();
		const form = Object.fromEntries(formData);
		const teamId = typeof form.teamId === 'string' ? form.teamId : '';

		if (!teamId) {
			return fail(HttpStatusCode.BadRequest, { error: 'Missing team' });
		}

		// The team's category decides who may rate it and with which criteria
		const category = await getTeamCategory(teamId);
		if (!canJudgeCategory(user, category)) {
			return fail(HttpStatusCode.Forbidden, { error: 'This team is not in your category.' });
		}

		if ((await getResultsState()).publishedCategories.includes(category!)) {
			return fail(HttpStatusCode.Forbidden, {
				error: 'Results are already published, ratings can no longer be changed.'
			});
		}

		const parsed = parseScores(form, criteriaFor(category));
		if (!parsed.ok) {
			return fail(HttpStatusCode.BadRequest, { error: parsed.error });
		}

		const rating: Rating = {
			comments: typeof form.comments === 'string' ? form.comments : '',
			jury: user!.id,
			team: teamId,
			scores: parsed.scores,
			finalGrade: parsed.finalGrade
		};

		try {
			const existingRatings = await locals.pb.collection('ratings').getList(1, 1, {
				filter: locals.pb.filter('jury = {:jury} && team = {:team}', {
					jury: user!.id,
					team: teamId
				})
			});

			if (existingRatings.totalItems > 0) {
				await locals.pb.collection('ratings').update(existingRatings.items[0].id, rating);
			} else {
				await locals.pb.collection('ratings').create(rating);
			}

			// A changed rating needs to be confirmed again before results can be published
			await setCategoryConfirmed(user!.id, category!, false);
		} catch (err: unknown) {
			console.error('Error in action:', err);
			pbError(err);
			throw error(HttpStatusCode.InternalServerError, 'Failed to create rating');
		}

		return { success: true };
	}
};
