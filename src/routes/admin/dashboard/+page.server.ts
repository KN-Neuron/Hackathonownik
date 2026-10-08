import { error, fail } from '@sveltejs/kit';
import { appConfig, getCategory, requiredFor } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import {
	getRatedPairs,
	getRatingProgress,
	getResultsState,
	invalidateRatings,
	setCategoryPublished,
	setCategoryStage,
	setTieWinner,
	setPresentationOrder,
	inPresentationOrder,
	stageOf
} from '$lib/server/results';
import { getCategoryRanking } from '$lib/server/ranking';
import { getViews } from '$lib/server/views';
import { setCategoryConfirmed } from '$lib/server/confirmations';
import { getTeamSubmissions, invalidateSubmissions } from '$lib/server/submissions';
import type { Actions, PageServerLoad } from './$types';
import { checkinStatus } from '$lib/utils/checkin';
import { generatePassword } from '$lib/server/passwords';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}

	locals.security.checkRateLimit('api');

	const categories = appConfig.event.categories.map((c) => c.key);
	const requested = url.searchParams.get('category');
	const category = requested && categories.includes(requested) ? requested : categories[0];

	try {
		const pb = await getAdminClient();
		const [teams, juries, progress, resultsState, submissions, members] = await Promise.all([
			pb.collection('teams').getFullList({ fields: 'id,name,category', sort: 'name' }),
			pb.collection('users').getFullList({
				filter: 'role = "jury"',
				fields: 'id,name,email,jury_categories,confirmed_categories',
				sort: 'name'
			}),
			getRatingProgress(),
			getResultsState(),
			getTeamSubmissions(),
			pb.collection('users').getFullList({ filter: 'team != ""', fields: 'team' })
		]);
		const teamSize = new Map<string, number>();
		for (const m of members) teamSize.set(m.team, (teamSize.get(m.team) ?? 0) + 1);

		// Every registered team of the selected category, also those that submitted nothing yet
		const submissionByTeam = new Map(submissions.map((s) => [s.teamId, s]));
		const submissionOverview = teams
			.filter((team) => team.category === category)
			.map((team) => {
				const submission = submissionByTeam.get(team.id) ?? null;
				return {
					teamId: team.id,
					teamName: team.name,
					presentation: Boolean(submission?.presentation),
					repo: Boolean(submission?.repo),
					video: Boolean(submission?.video),
					missing: submission ? submission.missing : requiredFor(category),
					lastUpdated: submission?.lastUpdated ?? null,
					// Rules §4: 3–4 people per team
					members: teamSize.get(team.id) ?? 0,
					checkin: checkinStatus(appConfig.event.checkin_deadline, submission?.firstSubmittedAt)
				};
			})
			.sort((a, b) => b.missing.length - a.missing.length || a.teamName.localeCompare(b.teamName));

		// Check-in: teams that uploaded anything before the check-in deadline
		const checkedIn = (teamIds: string[]) =>
			teamIds.filter(
				(id) =>
					checkinStatus(
						appConfig.event.checkin_deadline,
						submissionByTeam.get(id)?.firstSubmittedAt
					) === 'done'
			).length;
		const checkin = appConfig.event.checkin_deadline
			? {
					deadline: appConfig.event.checkin_deadline,
					total: teams.length,
					done: checkedIn(teams.map((t) => t.id)),
					perCategory: Object.fromEntries(
						categories.map((key) => [
							key,
							{
								done: checkedIn(teams.filter((t) => t.category === key).map((t) => t.id)),
								total: teams.filter((t) => t.category === key).length
							}
						])
					)
				}
			: null;

		// Per-category counters for the tabs and the overview
		const summary = Object.fromEntries(
			categories.map((key) => [
				key,
				{
					teams: teams.filter((t) => t.category === key).length,
					jurors: progress[key]?.juries.length ?? 0,
					ready: progress[key]?.readyToPublish ?? false,
					published: resultsState.publishedCategories.includes(key)
				}
			])
		);

		// Live ranking of the selected category (preliminary or final, by its stage)
		const categoryTeamIds = submissions.filter((s) => s.category === category).map((s) => s.teamId);
		const [ranking, views, ratedPairs] = await Promise.all([
			getCategoryRanking(category),
			getViews(categoryTeamIds).catch((e) => {
				console.error('Error loading jury views:', e);
				return [];
			}),
			getRatedPairs(category)
		]);

		return {
			categories,
			category,
			summary,
			stage: stageOf(resultsState, category),
			// Teams that submitted something, in the current presentation order
			// In the final only the finalists present, numbered like the jury sees them
			presentationOrder: inPresentationOrder(
				submissions.filter(
					(s) =>
						s.category === category &&
						(stageOf(resultsState, category) !== 'final' ||
							(resultsState.finalists[category] ?? []).includes(s.teamId))
				),
				resultsState.orders[category],
				(s) => s.teamId,
				(s) => s.teamName
			).map((s) => ({
				teamId: s.teamId,
				teamName: s.teamName,
				finalist: (resultsState.finalists[category] ?? []).includes(s.teamId)
			})),
			finalists: resultsState.finalists[category] ?? [],
			finalistsLimit: appConfig.event.finalists_per_category,
			ranking,
			// "jury:team" for every juror who already rated a team in the current stage
			rated: [...ratedPairs],
			// Which juror opened which material, per team (team → jury → items)
			views: views.reduce<Record<string, Record<string, string[]>>>((acc, v) => {
				((acc[v.team] ??= {})[v.jury] ??= []).push(v.item);
				return acc;
			}, {}),
			progress: progress[category],
			published: resultsState.publishedCategories.includes(category),
			publishedAt: resultsState.publishedAt[category] ?? null,
			submissionOverview,
			checkin,
			required: requiredFor(category),
			juries: juries.map((j) => ({
				id: j.id,
				name: j.name || j.email,
				email: j.email,
				categories: Array.isArray(j.jury_categories) ? j.jury_categories : []
			})),
			// Teams without a valid category are listed so they can be fixed
			uncategorizedTeams: teams
				.filter((t) => !categories.includes(t.category))
				.map((t) => ({ id: t.id, name: t.name })),
			teams: teams.map((t) => ({ id: t.id, name: t.name, category: t.category })),
			csrfToken: locals.csrfToken
		};
	} catch (e: any) {
		console.error('Error loading admin data:', e?.message || e);
		throw error(500, 'Could not load admin data');
	}
};

async function checkAdminForm(locals: App.Locals, formData: FormData) {
	try {
		locals.security.isAdmin();
	} catch (e: any) {
		return e.body?.message || 'Unauthorized';
	}
	const csrfToken = formData.get('csrf_token');
	if (!locals.csrfToken || locals.csrfToken !== csrfToken) {
		return 'Invalid security token';
	}
	return null;
}

/** Names of the given categories whose results are already published. */
async function publishedAmong(keys: string[]): Promise<string[]> {
	const { publishedCategories } = await getResultsState();
	return keys.filter((k) => publishedCategories.includes(k)).map((k) => getCategory(k)?.name ?? k);
}

const validCategory = (value: FormDataEntryValue | null) =>
	typeof value === 'string' && getCategory(value) ? value : null;

export const actions: Actions = {
	publishCategory: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		if (!category) return fail(400, { success: false, message: 'Unknown category' });

		// Publishing early would leak a provisional ranking, so it needs an explicit override
		const force = formData.get('force') === 'true';
		const [progress, state] = await Promise.all([
			getRatingProgress().then((p) => p[category]),
			getResultsState()
		]);
		if (stageOf(state, category) !== 'final' && !force) {
			return fail(400, {
				success: false,
				message: 'Pick the finalists and finish the final before publishing.'
			});
		}
		if (!progress?.readyToPublish && !force) {
			return fail(400, {
				success: false,
				message: 'Not every juror of this category has rated all finalists and confirmed.'
			});
		}

		try {
			await setCategoryPublished(category, true);
			return { success: true, message: `${getCategory(category)!.name}: results published` };
		} catch (e) {
			console.error('Error publishing results:', e);
			return fail(500, { success: false, message: 'Could not publish results' });
		}
	},

	unpublishCategory: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		if (!category) return fail(400, { success: false, message: 'Unknown category' });

		try {
			await setCategoryPublished(category, false);
			return { success: true, message: `${getCategory(category)!.name}: results hidden again` };
		} catch (e) {
			console.error('Error unpublishing results:', e);
			return fail(500, { success: false, message: 'Could not hide results' });
		}
	},

	// Rules §8: after the preliminary round the jury picks at most N teams for the final
	startFinal: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		if (!category) return fail(400, { success: false, message: 'Unknown category' });

		const submitted = new Set(
			(await getTeamSubmissions({ categories: [category] })).map((s) => s.teamId)
		);
		const finalists = [...new Set(formData.getAll('finalists').map(String))].filter((id) =>
			submitted.has(id)
		);
		const limit = appConfig.event.finalists_per_category;
		if (finalists.length === 0) {
			return fail(400, { success: false, message: 'Select at least one finalist.' });
		}
		if (finalists.length > limit) {
			return fail(400, { success: false, message: `At most ${limit} teams can reach the final.` });
		}

		const force = formData.get('force') === 'true';
		const progress = (await getRatingProgress())[category];
		if (!progress?.readyToPublish && !force) {
			return fail(400, {
				success: false,
				message: 'Not every juror has finished and confirmed the preliminary round.'
			});
		}

		try {
			await setCategoryStage(category, 'final', finalists);
			// Every juror confirms again once the final is rated
			await Promise.all(
				(progress?.juries ?? []).map((j) => setCategoryConfirmed(j.id, category, false))
			);
			return {
				success: true,
				message: `${getCategory(category)!.name}: final started with ${finalists.length} teams`
			};
		} catch (e) {
			console.error('Error starting the final:', e);
			return fail(500, { success: false, message: 'Could not start the final' });
		}
	},

	backToPreliminary: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		if (!category) return fail(400, { success: false, message: 'Unknown category' });
		if ((await getResultsState()).publishedCategories.includes(category)) {
			return fail(409, { success: false, message: 'Unpublish the category first.' });
		}

		try {
			await setCategoryStage(category, 'preliminary');
			return {
				success: true,
				message: `${getCategory(category)!.name}: back to the preliminary round`
			};
		} catch (e) {
			console.error('Error going back to the preliminary round:', e);
			return fail(500, { success: false, message: 'Could not change the stage' });
		}
	},

	setOrder: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		if (!category) return fail(400, { success: false, message: 'Unknown category' });

		const submitted = new Set(
			(await getTeamSubmissions({ categories: [category] })).map((s) => s.teamId)
		);
		const order = [...new Set(formData.getAll('order').map(String))].filter((id) =>
			submitted.has(id)
		);

		try {
			await setPresentationOrder(category, order);
			return { success: true, message: `${getCategory(category)!.name}: presentation order saved` };
		} catch (e) {
			console.error('Error saving the order:', e);
			return fail(500, { success: false, message: 'Could not save the order' });
		}
	},

	// Rules §8: a tie is decided by a jury vote, the organizers record the winner
	setTieWinner: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		const teamId = formData.get('team_id');
		if (!category || typeof teamId !== 'string') {
			return fail(400, { success: false, message: 'Missing category or team' });
		}

		try {
			await setTieWinner(category, teamId || null);
			return { success: true, message: teamId ? 'Tie-break winner saved' : 'Tie-break cleared' };
		} catch (e) {
			console.error('Error saving the tie-break:', e);
			return fail(500, { success: false, message: 'Could not save the tie-break' });
		}
	},

	// Organizers may confirm on a juror's behalf (e.g. a juror had to leave)
	confirmForJury: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const category = validCategory(formData.get('category'));
		const juryId = formData.get('jury_id');
		if (!category || typeof juryId !== 'string') {
			return fail(400, { success: false, message: 'Missing juror or category' });
		}

		try {
			await setCategoryConfirmed(juryId, category, true);
			return { success: true, message: 'Ratings confirmed' };
		} catch (e) {
			console.error('Error confirming for juror:', e);
			return fail(500, { success: false, message: 'Could not confirm ratings' });
		}
	},

	setJuryCategories: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const juryId = formData.get('jury_id');
		if (typeof juryId !== 'string') {
			return fail(400, { success: false, message: 'Missing juror' });
		}
		const categories = formData.getAll('categories').map(validCategory).filter(Boolean);

		try {
			const pb = await getAdminClient();
			const jury = await pb.collection('users').getOne(juryId, { fields: 'role,jury_categories' });
			if (jury.role !== 'jury') {
				return fail(400, { success: false, message: 'Only jury members can be assigned' });
			}
			const before: string[] = Array.isArray(jury.jury_categories) ? jury.jury_categories : [];
			const touched = [
				...categories.filter((c) => !before.includes(c as string)),
				...before.filter((c) => !categories.includes(c))
			] as string[];
			const locked = await publishedAmong(touched);
			if (locked.length) {
				return fail(409, {
					success: false,
					message: `Results of ${locked.join(', ')} are published; unpublish before changing its jury.`
				});
			}
			await pb.collection('users').update(juryId, { jury_categories: categories });
			invalidateRatings();
			return { success: true, message: 'Juror categories saved' };
		} catch (e) {
			console.error('Error assigning categories:', e);
			return fail(500, { success: false, message: 'Could not save categories' });
		}
	},

	// New jury accounts: organizers hand the generated password over to the juror
	addJury: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const name = String(formData.get('name') ?? '').trim();
		const email = String(formData.get('email') ?? '')
			.trim()
			.toLowerCase();
		const categories = formData.getAll('categories').map(validCategory).filter(Boolean);
		if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { success: false, message: "Enter the juror's name and a valid e-mail." });
		}

		const locked = await publishedAmong(categories as string[]);
		if (locked.length) {
			return fail(409, {
				success: false,
				message: `Results of ${locked.join(', ')} are published; unpublish before changing its jury.`
			});
		}

		const password = generatePassword();
		try {
			const pb = await getAdminClient();
			await pb.collection('users').create({
				name,
				email,
				role: 'jury',
				jury_categories: categories,
				password,
				passwordConfirm: password,
				verified: true
			});
			invalidateRatings();
			return {
				success: true,
				message: `Juror ${name} added`,
				credentials: { email, password }
			};
		} catch (e: any) {
			const taken = e?.response?.data?.email;
			console.error('Error adding juror:', e);
			return fail(taken ? 409 : 500, {
				success: false,
				message: taken ? 'An account with this e-mail already exists.' : 'Could not add the juror'
			});
		}
	},

	resetJuryPassword: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const juryId = formData.get('jury_id');
		if (typeof juryId !== 'string') return fail(400, { success: false, message: 'Missing juror' });

		const password = generatePassword();
		try {
			const pb = await getAdminClient();
			const jury = await pb.collection('users').getOne(juryId, { fields: 'role,email,name' });
			if (jury.role !== 'jury') {
				return fail(400, { success: false, message: 'Only jury passwords can be reset here' });
			}
			await pb.collection('users').update(juryId, { password, passwordConfirm: password });
			return {
				success: true,
				message: `New password for ${jury.name || jury.email}`,
				credentials: { email: jury.email, password }
			};
		} catch (e) {
			console.error('Error resetting password:', e);
			return fail(500, { success: false, message: 'Could not reset the password' });
		}
	},

	setTeamCategory: async ({ locals, request }) => {
		const formData = await request.formData();
		const authError = await checkAdminForm(locals, formData);
		if (authError) return fail(403, { success: false, message: authError });

		const teamId = formData.get('team_id');
		const category = validCategory(formData.get('category'));
		if (typeof teamId !== 'string' || !category) {
			return fail(400, { success: false, message: 'Missing team or category' });
		}

		try {
			const pb = await getAdminClient();
			const team = await pb.collection('teams').getOne(teamId, { fields: 'category,name' });
			if (team.category === category) {
				return { success: true, message: 'Nothing changed' };
			}

			const published = (await getResultsState()).publishedCategories;
			if (published.includes(team.category) || published.includes(category)) {
				return fail(409, {
					success: false,
					message: 'Unpublish both categories before moving a team between them.'
				});
			}

			// Ratings used the old category's criteria and jurors, so they can't be carried over
			const ratings = await pb.collection('ratings').getFullList({
				filter: pb.filter('team = {:team}', { team: teamId }),
				fields: 'id'
			});
			await Promise.all(ratings.map((r) => pb.collection('ratings').delete(r.id)));
			await pb.collection('teams').update(teamId, { category });
			invalidateSubmissions();

			return {
				success: true,
				message: `${team.name} moved to ${getCategory(category)!.name}${ratings.length ? `, ${ratings.length} rating(s) removed` : ''}`
			};
		} catch (e) {
			console.error('Error moving team:', e);
			return fail(500, { success: false, message: 'Could not move the team' });
		}
	}
};
