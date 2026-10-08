import type PocketBase from 'pocketbase';
import { Role } from '$lib/utils/utils';

type MaybeUser = { admin?: boolean; role?: string } | null | undefined;

export function isAdmin(user: MaybeUser): boolean {
	return Boolean(user && (user.admin || user.role === Role.Admin));
}

export function isJuryOrAdmin(user: MaybeUser): boolean {
	return Boolean(user && (isAdmin(user) || user.role === Role.Jury));
}

export async function areAllTeamsRated(pb: PocketBase): Promise<boolean> {
	let presentations;
	try {
		presentations = await pb.collection('presentations').getFullList({ fields: 'team' });
	} catch (e) {
		throw new Error('Failed to fetch presentations list', { cause: e });
	}

	if (presentations.length === 0) return false;

	let ratings;
	try {
		ratings = await pb.collection('ratings').getFullList({ fields: 'team' });
	} catch (e) {
		throw new Error('Failed to fetch ratings list', { cause: e });
	}

	if (ratings.length === 0) return false;

	// A team can have many presentation records (partial uploads)
	const teamIds = new Set(presentations.map((p) => p.team).filter(Boolean));
	const ratedTeamIds = new Set(ratings.map((r) => r.team));

	return Array.from(teamIds).every((teamId) => ratedTeamIds.has(teamId));
}

export async function areAllJuriesConfirmed(pb: PocketBase): Promise<boolean> {
	try {
		const juries = await pb.collection('users').getFullList({
			filter: 'role = "jury" || role = "admin"'
		});

		if (juries.length === 0) return false;

		return juries.every((jury) => jury.confirmedRating === true);
	} catch (e) {
		throw new Error('Failed to check jury confirmations', { cause: e });
	}
}

/** Results (rankings, scores, jury comments) become public once every team is rated and confirmed. */
export async function areResultsPublic(pb: PocketBase): Promise<boolean> {
	try {
		return (await areAllTeamsRated(pb)) && (await areAllJuriesConfirmed(pb));
	} catch (e) {
		console.error('Error checking whether results are public:', e);
		return false;
	}
}

/** Jury and admins always see results; participants only after they are published. */
export async function canSeeResults(locals: App.Locals): Promise<boolean> {
	if (!locals.user) return false;
	if (isJuryOrAdmin(locals.user)) return true;
	return areResultsPublic(locals.pb);
}
