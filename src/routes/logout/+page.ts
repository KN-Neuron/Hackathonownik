import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit';
import { invalidateAll } from '$app/navigation'

export const load = async () => {
    // +page.server.ts cleans  locals.pb & locals.user
    if (browser) {
        await invalidateAll()
    }

    redirect(303, '/');
}
