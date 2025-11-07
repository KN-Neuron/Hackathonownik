import { FileUploadSecurity } from '$lib/server/security.js';
import PocketBase from 'pocketbase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	try {
		locals.security.isAuthenticated();
	} catch (e: any) {
		// Redirect to login if not authenticated
		throw e;
	}

	// Return CSRF token for the form
	return {
		csrfToken: locals.csrfToken
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		// 1. Authentication check (without CSRF validation yet)
		try {
			locals.security.isAuthenticated();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized access'
			};
		}

		// 2. Get form data first
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const csrfToken = formData.get('csrf_token') as string;

		// 3. CSRF token validation - NOW we can validate because we have the token
		const cookieToken = locals.csrfToken;
		if (!cookieToken || !csrfToken || cookieToken !== csrfToken) {
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

		// 7. Check if team already has too many presentations (prevent spam)
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

		// 8. Upload file using admin credentials
		try {
			const uploadData = new FormData();
			uploadData.append('team', teamId);
			uploadData.append('presentation', file);

			// Use admin client for upload
			const adminClient = new PocketBase('https://frog01-32147.wykr.es/');

			// Get credentials from environment variables
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

			return {
				success: false,
				message: 'An error occurred during upload. Please try again.'
			};
		}
	}
};
