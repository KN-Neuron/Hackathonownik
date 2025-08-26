import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    await locals.pb.authStore.clear();
    locals.user = null;
};
