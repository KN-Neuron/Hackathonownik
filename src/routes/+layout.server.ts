import type { LayoutServerLoad } from './$types';

async function areAllJuriesConfirmed(pb: any): Promise<boolean> {
	try {
		// Get all jury members
		const juries = await pb.collection('users').getFullList({
			filter: 'role = "jury"'
		});

		if (juries.length === 0) return false;

		// Check if all juries have confirmed their ratings
		const confirmedJuries = juries.filter((jury: any) => jury.confirmedRating === true);

		return confirmedJuries.length === juries.length;
	} catch (e) {
		console.error('Failed to check jury confirmations', e);
		return false;
	}
}

export const load: LayoutServerLoad = async ({ locals }) => {
	let teamCategory: string | null = null;
	let allJuriesConfirmed = false;

	// If user is a participant with a team, fetch the team's category
	if (locals.user?.team && locals.pb) {
		try {
			const team = await locals.pb.collection('teams').getOne(locals.user.team);
			teamCategory = team.category || null;
		} catch (err) {
			// Team not found or error - ignore
			console.error('Error fetching team category:', err);
		}
	}

	// Check if all juries have confirmed their ratings
	allJuriesConfirmed = await areAllJuriesConfirmed(locals.pb);

	return {
		user: locals.user,
		csrfToken: locals.csrfToken,
		teamCategory,
		allJuriesConfirmed
	};
};
