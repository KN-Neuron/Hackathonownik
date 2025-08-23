import { pbError } from '$lib/pocketbase.svelte';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		if (!locals.user) {
			return {
				success: false,
				message: 'You must be logged in to upload files'
			};
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return {
				success: false,
				message: 'No file provided'
			};
		}

		if (!file.name.toLowerCase().endsWith('.pdf')) {
			return {
				success: false,
				message: 'Only PDF files are allowed'
			};
		}

		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return {
				success: false,
				message: 'File size exceeds the maximum limit of 10MB'
			};
		}

		try {
			const teamId = locals.user.team;

			if (!teamId) {
				return {
					success: false,
					message: 'You are not associated with any team'
				};
			}

			const uploadData = new FormData();
			uploadData.append('team', teamId);
			uploadData.append('presentation', file);

			await locals.pb.collection('presentations').create(uploadData);

			return {
				success: true,
				message: `File uploaded successfully!`
			};
		} catch (err: unknown) {
			console.error('Upload error:', err);
			const errorMessage = pbError(err) || 'An error occurred during upload';

			return {
				success: false,
				message: errorMessage
			};
		}
	}
};
