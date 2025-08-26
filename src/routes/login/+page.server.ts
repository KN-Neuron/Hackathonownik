import { pbError } from '$lib/pocketbase.svelte';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	locals.user && redirect(303, '/');
};

export const actions = {
	default: async ({ locals, request }) => {
		const form = Object.fromEntries(await request.formData()) as {
			email: string;
			password: string;
		};

		try {
			await locals.pb.collection('users').authWithPassword(form.email, form.password);
		} catch (e) {
			pbError(e);
		}
	}
} satisfies Actions;
