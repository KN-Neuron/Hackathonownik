import { pbError } from '$lib/pocketbase.svelte'
import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    locals.user && redirect(303, '/')
}

export const actions: Actions = {
    default: async ({ locals, request }) => {
        const form = Object.fromEntries(await request.formData()) as {
            email: string
            password: string
            passwordConfirm: string
        }

        

        const user = {
            email: form.email,
            password: form.password,
            passwordConfirm: form.passwordConfirm,
        }

        

        try {
            if (user.email && user.password) {
                await locals.pb.collection('users').create(user)
                await locals.pb.collection('users').authWithPassword(user.email, user.password)
            }
        } catch (err: unknown) {
            pbError(err)
        }
        redirect(303, '/')
    },
}
