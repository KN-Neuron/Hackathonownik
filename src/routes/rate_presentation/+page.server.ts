import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { pbError } from '$lib/pocketbase.svelte';
import { HttpStatusCode } from '$lib/utils/utils';
import type { Rating, TeamSubmission, User } from '$lib/types';
import { getTeamSubmissions } from '$lib/server/submissions';
import {
	canJudgeCategory,
	getTeamCategory,
	isJuryOrAdmin,
	juryCategories,
	resultsClient
} from '$lib/server/access';
import { parseScores } from '$lib/server/ratings';
import {
	getRatingProgress,
	getResultsState,
	invalidateRatings,
	inPresentationOrder,
	stageCriteria,
	stageOf
} from '$lib/server/results';
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
	// Position in the presentation order
	order: number;
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
		// Preliminary round: every team with a submission; final: only the finalists
		const stage = stageOf(state, category);
		const inStage = new Set(categoryProgress?.teamIds ?? []);
		const criteria = stageCriteria(category, stage);
		const stageKeys = criteria.map((c) => c.key);

		const pb = await resultsClient();
		const teamIds = submissions.filter((s) => inStage.has(s.teamId)).map((s) => s.teamId);
		const ratings = teamIds.length
			? await pb.collection('ratings').getFullList({
					filter: teamIds.map((id) => pb.filter('team = {:id}', { id })).join(' || '),
					fields: 'jury,team,scores,finalGrade'
				})
			: [];

		// Alphabetical, so every juror of a category sees the same order
		// In the organizers' presentation order, so jurors follow the stage
		const sorted = inPresentationOrder(
			submissions.filter((s) => inStage.has(s.teamId)),
			state.orders[category],
			(s) => s.teamId,
			(s) => s.teamName
		);
		const teams: TeamWithPresentationUrl[] = sorted.map((submission) => {
			// A rating counts for this stage once every criterion of the stage is scored
			const complete = (r: (typeof ratings)[number]) =>
				stageKeys.every((k) => typeof r.scores?.[k] === 'number');
			const forTeam = ratings.filter((r) => r.team === submission.teamId && complete(r));
			const mine = ratings.find((r) => r.team === submission.teamId && r.jury === locals.user!.id);
			return {
				id: submission.teamId,
				name: submission.teamName,
				order: submission.order,
				category: submission.category,
				presentationUrl: submission.presentation?.url ?? null,
				repo_link: submission.repo?.url ?? null,
				video_link: submission.video?.url ?? null,
				submission,
				// Only ratings of the category's jurors count
				ratingsCount: new Set(forTeam.filter((r) => juryIds.has(r.jury)).map((r) => r.jury)).size,
				totalJuries: juryIds.size,
				isRatedByCurrentJury: Boolean(mine && complete(mine)),
				scores: mine?.scores ?? null,
				stage,
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
			published: state.publishedCategories.includes(category),
			stage,
			criteria
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

		// Preliminary round: preliminary criteria; final: every criterion, finalists only
		const state = await getResultsState();
		const stage = stageOf(state, category!);
		if (stage === 'final' && !(state.finalists[category!] ?? []).includes(teamId)) {
			return fail(HttpStatusCode.Forbidden, { error: 'This team is not in the final.' });
		}

		const parsed = parseScores(form, stageCriteria(category!, stage));
		if (!parsed.ok) {
			return fail(HttpStatusCode.BadRequest, { error: parsed.error });
		}

		const existingRatings = await locals.pb.collection('ratings').getList(1, 1, {
			filter: locals.pb.filter('jury = {:jury} && team = {:team}', { jury: user!.id, team: teamId })
		});
		const existing = existingRatings.items[0];

		// Keep scores of the other stage (e.g. the final presentation score) untouched
		const scores: Record<string, number> = { ...(existing?.scores ?? {}), ...parsed.scores };
		const rating: Rating = {
			comments: typeof form.comments === 'string' ? form.comments : '',
			jury: user!.id,
			team: teamId,
			scores,
			finalGrade: Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0)
		};

		try {
			if (existing) {
				await locals.pb.collection('ratings').update(existing.id, rating);
			} else {
				await locals.pb.collection('ratings').create(rating);
			}

			invalidateRatings();
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
