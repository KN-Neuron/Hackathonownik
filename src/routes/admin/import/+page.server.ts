import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { appConfig } from '$lib/server/appConfig';
import { getAdminClient } from '$lib/server/adminClient';
import { generatePassword } from '$lib/server/passwords';
import { planImport, type ImportPlan } from '$lib/server/participantImport';
import { invalidateSubmissions } from '$lib/server/submissions';
import { invalidateRatings } from '$lib/server/results';

const MAX_FILE_BYTES = 1_000_000;

export const load: PageServerLoad = async ({ locals }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}
	return {
		categories: appConfig.event.categories.map((c) => ({ key: c.key, name: c.name })),
		csrfToken: locals.csrfToken
	};
};

async function planFromForm(locals: App.Locals, formData: FormData) {
	try {
		locals.security.isAdmin();
	} catch {
		return { error: 'Unauthorized' };
	}
	if (!locals.csrfToken || locals.csrfToken !== formData.get('csrf_token')) {
		return { error: 'Invalid security token' };
	}

	// The file on the first step, the same text sent back on the second one
	const file = formData.get('file');
	const text =
		file instanceof File && file.size > 0
			? file.size > MAX_FILE_BYTES
				? null
				: await file.text()
			: String(formData.get('csv') ?? '');
	if (text === null) return { error: 'The file is too large (limit 1 MB).' };
	if (!text.trim()) return { error: 'Choose a CSV file first.' };

	const pb = await getAdminClient();
	const [teams, users] = await Promise.all([
		pb.collection('teams').getFullList({ fields: 'id,name,category' }),
		pb.collection('users').getFullList({ fields: 'email' })
	]);
	const plan = planImport(
		text,
		appConfig.event.categories.map((c) => ({ key: c.key, name: c.name })),
		{
			teams: teams.map((t) => ({ name: t.name, category: t.category })),
			emails: new Set(users.map((u) => String(u.email).toLowerCase()))
		}
	);
	return { text, plan, teams };
}

export const actions: Actions = {
	// Step 1: validate the file and show what would happen, change nothing
	preview: async ({ locals, request }) => {
		const result = await planFromForm(locals, await request.formData());
		if ('error' in result) return fail(400, { step: 'preview' as const, message: result.error });
		return { step: 'preview' as const, csv: result.text, plan: result.plan };
	},

	// Step 2: create the teams and accounts; passwords are shown once
	apply: async ({ locals, request }) => {
		const result = await planFromForm(locals, await request.formData());
		if ('error' in result) return fail(400, { step: 'preview' as const, message: result.error });
		const { plan, teams } = result;
		if (plan.errors.length > 0) {
			return fail(400, {
				step: 'preview' as const,
				message: 'Fix the errors first.',
				csv: result.text,
				plan
			});
		}

		const pb = await getAdminClient();
		const teamIds = new Map(teams.map((t) => [t.name.trim().toLowerCase(), t.id as string]));
		const failures: { email: string; message: string }[] = [];
		const created: {
			name: string;
			email: string;
			team: string;
			category: string;
			password: string;
		}[] = [];

		try {
			for (const team of plan.newTeams) {
				const record = await pb
					.collection('teams')
					.create({ name: team.name, category: team.category });
				teamIds.set(team.name.trim().toLowerCase(), record.id);
			}
		} catch (e) {
			console.error('Error creating teams:', e);
			return fail(500, {
				step: 'preview' as const,
				message: 'Could not create the teams.',
				csv: result.text,
				plan
			});
		}

		// A few accounts at a time: password hashing makes every create take a moment
		const queue = [...plan.participants];
		const worker = async () => {
			for (let row = queue.shift(); row; row = queue.shift()) {
				const password = generatePassword();
				try {
					await pb.collection('users').create({
						name: row.name,
						email: row.email,
						role: 'participant',
						team: teamIds.get(row.team.trim().toLowerCase()),
						password,
						passwordConfirm: password,
						verified: true
					});
					created.push({ ...row, password });
				} catch (e: any) {
					failures.push({
						email: row.email,
						message: e?.response?.data?.email?.message ?? 'Could not create the account'
					});
				}
			}
		};
		await Promise.all(Array.from({ length: 6 }, worker));

		invalidateSubmissions();
		invalidateRatings();
		created.sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
		return {
			step: 'done' as const,
			created,
			failures,
			teamsCreated: plan.newTeams.length,
			skipped: plan.skipped
		};
	}
} satisfies Actions;

export type { ImportPlan };
