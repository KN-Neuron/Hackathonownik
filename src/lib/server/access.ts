import type PocketBase from 'pocketbase';
import { Role } from '$lib/utils/utils';
import { getAdminClient } from './adminClient';
import { appConfig } from './appConfig';
import { getRatingProgress, getResultsState } from './results';

type MaybeUser =
	| { admin?: boolean; role?: string; jury_categories?: unknown; team?: string }
	| null
	| undefined;

export function isAdmin(user: MaybeUser): boolean {
	return Boolean(user && (user.admin || user.role === Role.Admin));
}

export function isJuryOrAdmin(user: MaybeUser): boolean {
	return Boolean(user && (isAdmin(user) || user.role === Role.Jury));
}

const allCategories = () => appConfig.event.categories.map((c) => c.key);

/** Categories a user works with as jury: admins all, jurors their assignment, others none. */
export function juryCategories(user: MaybeUser): string[] {
	if (isAdmin(user)) return allCategories();
	if (user?.role !== Role.Jury || !Array.isArray(user.jury_categories)) return [];
	return user.jury_categories.filter((key): key is string => allCategories().includes(key));
}

/** Jurors may only see, rate and take notes on teams of their own categories. */
export function canJudgeCategory(user: MaybeUser, category: string | null | undefined): boolean {
	return Boolean(category && juryCategories(user).includes(category));
}

/** Team id → category, read as superuser. */
export async function getTeamCategory(teamId: string): Promise<string | null> {
	try {
		const pb = await getAdminClient();
		const team = await pb.collection('teams').getOne(teamId, { fields: 'category' });
		return team.category || null;
	} catch {
		return null;
	}
}

/**
 * Categories whose results (ranking, scores, feedback) the user may see:
 * - admins: all, always;
 * - everyone: categories an organizer published;
 * - jurors: their categories once every juror of the category rated all teams and confirmed,
 *   so a live ranking can't influence ratings still in progress.
 */
export async function visibleResultCategories(locals: App.Locals): Promise<string[]> {
	if (!locals.user) return [];
	if (isAdmin(locals.user)) return allCategories();

	const visible = new Set((await getResultsState()).publishedCategories);
	const own = juryCategories(locals.user);
	if (own.length) {
		try {
			const progress = await getRatingProgress();
			own.filter((key) => progress[key]?.readyToPublish).forEach((key) => visible.add(key));
		} catch (e) {
			console.error('Error checking rating progress:', e);
		}
	}
	return allCategories().filter((key) => visible.has(key));
}

export async function canSeeResults(locals: App.Locals, category: string | null): Promise<boolean> {
	return Boolean(category) && (await visibleResultCategories(locals)).includes(category!);
}

/** Exports and raw rating history include feedback of every team: jury and admins only. */
export async function canSeeInternalResults(
	locals: App.Locals,
	category: string | null
): Promise<boolean> {
	return isJuryOrAdmin(locals.user) && (await canSeeResults(locals, category));
}

/**
 * Client to read other people's ratings with. In PocketBase jurors can read only their own
 * ratings and participants none, so results are read as superuser after the app's own access
 * check (visibleResultCategories / canSeeResults) passed.
 */
export async function resultsClient(): Promise<PocketBase> {
	return getAdminClient();
}
