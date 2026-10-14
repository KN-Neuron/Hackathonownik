import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAuditLog } from '$lib/server/audit';

// Who did what in the admin area (read-only)
export const load: PageServerLoad = async ({ locals }) => {
	try {
		locals.security.isAdmin();
	} catch {
		throw error(403, 'Admin access required');
	}
	return { entries: await getAuditLog(500) };
};
