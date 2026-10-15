import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { appConfig, criteriaFor } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import { getResultsState, inPresentationOrder, stageOf } from '$lib/server/results';

// Every rating of every juror, with all criteria of both stages and the comments:
// the organizers see more than the jurors, the teams or the ranking
export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}

	const categories = appConfig.event.categories.map((c) => ({ key: c.key, name: c.name }));
	const requested = url.searchParams.get('category');
	const category = categories.find((c) => c.key === requested)?.key ?? categories[0].key;

	const pb = await getAdminClient();
	const [teams, users, state] = await Promise.all([
		pb.collection('teams').getFullList({
			filter: pb.filter('category = {:category}', { category }),
			fields: 'id,name'
		}),
		pb.collection('users').getFullList({ fields: 'id,name,email,role,jury_categories' }),
		getResultsState()
	]);

	const ratings = teams.length
		? await pb.collection('ratings').getFullList({
				filter: teams.map((t) => pb.filter('team = {:id}', { id: t.id })).join(' || ')
			})
		: [];

	const userById = new Map(users.map((u) => [u.id, u]));
	const assigned = users
		.filter(
			(u) =>
				u.role === 'jury' &&
				Array.isArray(u.jury_categories) &&
				u.jury_categories.includes(category)
		)
		.map((u) => u.id);
	// Whoever rated is listed, also admins and jurors no longer assigned to the category
	const jurorIds = [...new Set([...assigned, ...ratings.map((r) => r.jury)])];

	const criteria = criteriaFor(category);
	const ordered = inPresentationOrder(
		teams,
		state.orders[category],
		(t) => t.id,
		(t) => t.name
	);

	return {
		categories,
		category,
		stage: stageOf(state, category),
		finalists: state.finalists[category] ?? [],
		criteria: criteria.map((c) => ({
			key: c.key,
			name: c.name,
			maxScore: c.maxScore,
			stage: c.stage
		})),
		jurors: jurorIds.map((id) => {
			const u = userById.get(id);
			return {
				id,
				name: u?.name || u?.email || 'deleted account',
				note: !u
					? 'deleted'
					: u.role !== 'jury'
						? u.role
						: assigned.includes(id)
							? ''
							: 'not assigned'
			};
		}),
		teams: ordered.map((team) => ({
			id: team.id,
			name: team.name,
			order: team.order,
			ratings: ratings
				.filter((r) => r.team === team.id)
				.map((r) => ({
					jury: r.jury,
					scores: (r.scores ?? {}) as Record<string, number>,
					finalGrade: r.finalGrade ?? 0,
					comments: r.comments || '',
					updated: r.updated
				}))
		}))
	};
};
