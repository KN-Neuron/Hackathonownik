import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
    locals.pb.authStore.clear();
    locals.user = null;
    throw redirect(303, '/');
};
