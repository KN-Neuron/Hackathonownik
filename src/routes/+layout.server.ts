import { appConfig } from '$lib/server/appConfig';
import type { LayoutServerLoad } from './$types';

async function areAllJuriesConfirmed(pb: any): Promise<boolean> {
	try {
		const juries = await pb.collection('users').getFullList({
			filter: 'role = "jury"'
		});

		if (juries.length === 0) return false;

		const confirmedJuries = juries.filter((jury: any) => jury.confirmedRating === true);

		return confirmedJuries.length === juries.length;
	} catch (e) {
		console.error('Failed to check jury confirmations', e);
		return false;
	}
}

async function areAllAdminsConfirmed(pb: any): Promise<boolean> {
	try {
		const admins = await pb.collection('users').getFullList({
			filter: 'role = "admin"'
		});

		if (admins.length === 0) return false;

		const confirmedAdmins = admins.filter((admin: any) => admin.confirmedRating === true);

		return confirmedAdmins.length === admins.length;
	} catch (e) {
		console.error('Failed to check jury confirmations', e);
		return false;
	}
}

export const load: LayoutServerLoad = async ({ locals }) => {
	let teamCategory: string | null = null;
	let allJuriesConfirmed = false;
	let allAdminsConfirmed = false;

	if (locals.user?.team && locals.pb) {
		try {
			const team = await locals.pb.collection('teams').getOne(locals.user.team);
			teamCategory = team.category || null;
		} catch (err) {
			console.error('Error fetching team category:', err);
		}
	}

	allJuriesConfirmed = await areAllJuriesConfirmed(locals.pb);
	allAdminsConfirmed = await areAllAdminsConfirmed(locals.pb);
	// console.log(allAdminsConfirmed);

	return {
		user: locals.user,
		csrfToken: locals.csrfToken,
		teamCategory,
		allJuriesConfirmed,
		allAdminsConfirmed,
		eventConfig: appConfig.event
	};
};
