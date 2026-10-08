import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTeamSubmission } from '$lib/server/submissions';
import { getResultsState, getTeamFeedback, stageOf } from '$lib/server/results';
import { getCategoryRanking } from '$lib/server/ranking';
import { getAdminClient } from '$lib/server/adminClient';
import { appConfig, requiredFor } from '$lib/server/appConfig';

// Where to send participants who need help from the organizers (Discord link if configured)
function organizerContactUrl(): string {
	const discord = appConfig.event.links?.find((link) => /discord/i.test(link.title + link.url));
	return discord?.url ?? '/info';
}

async function getTeam(teamId: string): Promise<{ name: string; category: string | null }> {
	const pb = await getAdminClient();
	const team = await pb.collection('teams').getOne(teamId, { fields: 'name,category' });
	return { name: team.name, category: team.category || null };
}

async function getTeamMembers(teamId: string): Promise<string[]> {
	const pb = await getAdminClient();
	const members = await pb.collection('users').getFullList({
		filter: pb.filter('team = {:team}', { team: teamId }),
		fields: 'name,email',
		sort: 'name'
	});
	return members.map((m) => m.name || m.email);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (locals.user.role === 'jury' || locals.user.role === 'admin' || locals.user.admin) {
		throw redirect(303, '/presentations');
	}

	const contactUrl = organizerContactUrl();
	const teamId = locals.user.team;
	if (!teamId) {
		return {
			submission: null,
			members: [],
			contactUrl,
			required: [],
			error: 'You are not assigned to a team yet, so you cannot submit a project.'
		};
	}

	try {
		const [submission, state, members, team] = await Promise.all([
			getTeamSubmission(teamId),
			getResultsState(),
			getTeamMembers(teamId).catch((e) => {
				console.error('Error fetching team members:', e);
				return [] as string[];
			}),
			getTeam(teamId)
		]);
		const category = team.category;
		const published = Boolean(category && state.publishedCategories.includes(category));
		const inFinal = Boolean(
			category &&
				stageOf(state, category) === 'final' &&
				state.finalists[category]?.includes(teamId)
		);
		// Place in the published ranking
		const place = published
			? ((await getCategoryRanking(category!)).rankings.find((r) => r.teamId === teamId)?.rank ??
				null)
			: null;
		return {
			submission,
			members,
			contactUrl,
			teamName: team.name,
			teamCategory: category,
			required: requiredFor(category),
			// Feedback from the jury reaches the team only after results are published
			feedback: published ? await getTeamFeedback(teamId) : null,
			inFinal,
			published,
			place,
			error: null
		};
	} catch (err) {
		console.error('Error fetching team submission:', err);
		return {
			submission: null,
			members: [],
			contactUrl,
			required: [],
			error: 'An error occurred while fetching your submission.'
		};
	}
};
