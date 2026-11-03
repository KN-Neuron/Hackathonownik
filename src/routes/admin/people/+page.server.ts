import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { appConfig, getCategory, requiredFor } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import { getTeamSubmissions } from '$lib/server/submissions';

// Everyone and every team, with their submissions: read-only overview for the organizers
export const load: PageServerLoad = async ({ locals }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}

	const pb = await getAdminClient();
	const [users, teams, submissions] = await Promise.all([
		pb.collection('users').getFullList({ sort: 'name' }),
		pb.collection('teams').getFullList({ sort: 'name' }),
		getTeamSubmissions()
	]);

	const submissionByTeam = new Map(submissions.map((s) => [s.teamId, s]));
	const membersByTeam = new Map<string, string[]>();
	for (const u of users) {
		if (u.team)
			membersByTeam.set(u.team, [...(membersByTeam.get(u.team) ?? []), u.name || u.email]);
	}
	const teamName = new Map(teams.map((t) => [t.id, t.name]));
	const categoryName = (key?: string) =>
		key ? (getCategory(key)?.name ?? `unknown (${key})`) : '–';

	return {
		counts: {
			participants: users.filter((u) => u.role === 'participant').length,
			jurors: users.filter((u) => u.role === 'jury').length,
			admins: users.filter((u) => u.role === 'admin').length,
			teams: teams.length
		},
		teams: teams.map((t) => {
			const submission = submissionByTeam.get(t.id) ?? null;
			const members = membersByTeam.get(t.id) ?? [];
			const required = requiredFor(t.category);
			return {
				id: t.id,
				name: t.name,
				category: categoryName(t.category),
				validCategory: Boolean(getCategory(t.category)),
				members,
				items: {
					presentation: Boolean(submission?.presentation),
					repo: Boolean(submission?.repo),
					video: Boolean(submission?.video),
					final_presentation: Boolean(submission?.final_presentation)
				},
				missing: submission ? submission.missing : required,
				lastUpdated: submission?.lastUpdated ?? null,
				// Every save of the team: who added what and when
				history: (submission?.history ?? []).map((h) => ({
					at: h.at,
					by: h.submittedBy,
					items: h.items
				}))
			};
		}),
		users: users.map((u) => ({
			id: u.id,
			name: u.name || '',
			email: u.email,
			role: u.role || '(none)',
			team: u.team ? (teamName.get(u.team) ?? 'unknown team') : '',
			juryCategories: Array.isArray(u.jury_categories) ? u.jury_categories.map(categoryName) : [],
			confirmed: Array.isArray(u.confirmed_categories)
				? u.confirmed_categories.map(categoryName)
				: [],
			created: u.created
		})),
		teamRules: { min: 3, max: 4 },
		eventName: `${appConfig.event.name} ${appConfig.event.year}`
	};
};
