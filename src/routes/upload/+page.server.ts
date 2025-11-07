import { pbError } from '$lib/pocketbase.svelte';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import PocketBase from 'pocketbase';
import { FileUploadSecurity, CSRFProtection } from '$lib/server/security';

export const load: PageServerLoad = async ({ locals }) => {
	// Security check
	locals.security.isAuthenticated();

	return {
		user: locals.user,
		csrfToken: locals.csrfToken
	};
};

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		// 1. Security checks
		try {
			locals.security.isAuthenticated().validateCSRF();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized access'
			};
		}

		// 2. Get form data
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const csrfToken = formData.get('csrf_token') as string;

		// 3. Validate CSRF token from form
		const cookieToken = locals.csrfToken;
		if (!cookieToken || cookieToken !== csrfToken) {
			return {
				success: false,
				message: 'Invalid security token. Please refresh the page and try again.'
			};
		}

		// 4. Validate file presence
		if (!file || file.size === 0) {
			return {
				success: false,
				message: 'No file provided'
			};
		}

		// 5. Comprehensive file validation
		const validation = await FileUploadSecurity.validatePdfUpload(file);
		if (!validation.valid) {
			return {
				success: false,
				message: validation.error || 'Invalid file'
			};
		}

		// 6. Check team association
		const teamId = locals.user?.team;
		if (!teamId) {
			return {
				success: false,
				message: 'You are not associated with any team'
			};
		}

		// 7. Check if team already has a presentation (prevent spam)
		try {
			const existingPresentations = await locals.pb.collection('presentations').getFullList({
				filter: `team = "${teamId}"`
			});

			// Limit to max 5 presentations per team
			if (existingPresentations.length >= 5) {
				return {
					success: false,
					message: 'Maximum number of presentations reached. Please delete old presentations first.'
				};
			}
		} catch (e) {
			console.error('Error checking existing presentations:', e);
		}

		// 8. Upload file
		try {
			const uploadData = new FormData();
			uploadData.append('team', teamId);
			uploadData.append('presentation', file);

			// IMPORTANT: Nie używaj hardcoded credentials!
			// To musi być w zmiennych środowiskowych
			// Dla celów demo zostawiam, ale w produkcji ZMIEŃ!
			let adminClient = new PocketBase('https://frog01-32147.wykr.es/');

			// TODO: Przenieś to do env variables
			const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@ad.min';
			const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'Password123!';

			await adminClient.collection('_superusers').authWithPassword(adminEmail, adminPassword);
			await adminClient.collection('presentations').create(uploadData);

			return {
				success: true,
				message: 'File uploaded successfully!'
			};
		} catch (err: unknown) {
			console.error('Upload error:', err);

			// Nie ujawniaj szczegółów błędu użytkownikowi
			return {
				success: false,
				message: 'An error occurred during upload. Please try again.'
			};
		}
	}
};
