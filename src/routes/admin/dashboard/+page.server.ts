import { error, fail } from '@sveltejs/kit';
import { appConfig, getCategory, requiredFor } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import { getRatingProgress, getResultsState, setCategoryPublished } from '$lib/server/results';
import { setCategoryConfirmed } from '$lib/server/confirmations';
import { getTeamSubmissions } from '$lib/server/submissions';
import type { Actions, PageServerLoad } from './$types';

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
		const [teams, juries, progress, resultsState, submissions] = await Promise.all([
			pb.collection('teams').getFullList({ fields: 'id,name,category', sort: 'name' }),
			pb.collection('users').getFullList({
				filter: 'role = "jury"',
				fields: 'id,name,email,jury_categories,confirmed_categories',
				sort: 'name'
			}),
			getRatingProgress(),
			getResultsState(),
			getTeamSubmissions()
		]);

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
					lastUpdated: submission?.lastUpdated ?? null
				};
			})
			.sort((a, b) => b.missing.length - a.missing.length || a.teamName.localeCompare(b.teamName));

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

		return {
			categories,
			category,
			summary,
			progress: progress[category],
			published: resultsState.publishedCategories.includes(category),
			publishedAt: resultsState.publishedAt[category] ?? null,
			submissionOverview,
			required: requiredFor(category),
			juries: juries.map((j) => ({
				id: j.id,
				name: j.name || j.email,
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
		const progress = (await getRatingProgress())[category];
		if (!progress?.readyToPublish && !force) {
			return fail(400, {
				success: false,
				message: 'Not every juror of this category has rated all teams and confirmed.'
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
			const jury = await pb.collection('users').getOne(juryId, { fields: 'role' });
			if (jury.role !== 'jury') {
				return fail(400, { success: false, message: 'Only jury members can be assigned' });
			}
			await pb.collection('users').update(juryId, { jury_categories: categories });
			return { success: true, message: 'Juror categories saved' };
		} catch (e) {
			console.error('Error assigning categories:', e);
			return fail(500, { success: false, message: 'Could not save categories' });
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
