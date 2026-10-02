import type PocketBase from 'pocketbase';
import { Role } from '$lib/utils/utils';
import { getAdminClient } from './adminClient';
import { getRatingProgress, getResultsState } from './results';

type MaybeUser = { admin?: boolean; role?: string } | null | undefined;

export function isAdmin(user: MaybeUser): boolean {
	return Boolean(user && (user.admin || user.role === Role.Admin));
}

export function isJuryOrAdmin(user: MaybeUser): boolean {
	return Boolean(user && (isAdmin(user) || user.role === Role.Jury));
}

/** Results (rankings, scores, feedback) are public only after an organizer publishes them. */
export async function areResultsPublic(): Promise<boolean> {
	return (await getResultsState()).published;
}

/**
 * Admins always see results. The jury sees them once every jury member has rated all teams and
 * confirmed, so a live ranking can't influence ratings. Participants only after publishing.
 */
export async function canSeeResults(locals: App.Locals): Promise<boolean> {
	if (!locals.user) return false;
	if (isAdmin(locals.user)) return true;
	if (await areResultsPublic()) return true;
	if (isJuryOrAdmin(locals.user)) {
		try {
			return (await getRatingProgress(locals.pb)).readyToPublish;
		} catch (e) {
			console.error('Error checking rating progress:', e);
			return false;
		}
	}
	return false;
}

/** Exports and raw rating history include every team's feedback: jury and admins only. */
export async function canSeeInternalResults(locals: App.Locals): Promise<boolean> {
	return isJuryOrAdmin(locals.user) && (await canSeeResults(locals));
}

/**
 * Client to read ratings with. Participants may not read ratings directly (PocketBase rules),
 * so once results are published their reads go through the superuser client.
 * Only call after canSeeResults() returned true.
 */
export async function resultsClient(locals: App.Locals): Promise<PocketBase> {
	return isJuryOrAdmin(locals.user) ? locals.pb : getAdminClient();
}
