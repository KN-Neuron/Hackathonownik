import type PocketBase from 'pocketbase';
import { Role } from '$lib/utils/utils';
import { getAdminClient } from './adminClient';
import { getResultsState } from './results';

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

/** Jury and admins always see results; participants only after they are published. */
export async function canSeeResults(locals: App.Locals): Promise<boolean> {
	if (!locals.user) return false;
	if (isJuryOrAdmin(locals.user)) return true;
	return areResultsPublic();
}

/**
 * Client to read ratings with. Participants may not read ratings directly (PocketBase rules),
 * so once results are published their reads go through the superuser client.
 * Only call after canSeeResults() returned true.
 */
export async function resultsClient(locals: App.Locals): Promise<PocketBase> {
	return isJuryOrAdmin(locals.user) ? locals.pb : getAdminClient();
}
