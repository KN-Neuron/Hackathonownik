import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit';
import { invalidateAll } from '$app/navigation'

export const load = async () => {
    
    if (browser) {
        await invalidateAll()
    }

    redirect(303, '/');
}
