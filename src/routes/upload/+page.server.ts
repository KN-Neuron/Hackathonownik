import { FileUploadSecurity } from '$lib/server/security.js';
import PocketBase from 'pocketbase';
import type { Actions, PageServerLoad } from './$types';
import 'dotenv/config';

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
		// 1. Check deadline (12:00 PM on 30.11.2025)
		const deadline = new Date('2025-12-30T12:00:00');
		const now = new Date();
		if (now > deadline) {
			return {
				success: false,
				message:
					'Submission deadline has passed. Presentations can no longer be submitted after November 30, 2025 at 12:00 PM.'
			};
		}

		// 2. Authentication check (without CSRF validation yet)
		try {
			locals.security.isAuthenticated();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized access'
			};
		}

		// 3. Get form data first
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const repoLink = formData.get('repo_link') as string;
		const videoLink = formData.get('video_link') as string;
		const csrfToken = formData.get('csrf_token') as string;

		// Validate repo link if provided
		if (repoLink) {
			try {
				new URL(repoLink); // This will throw an error if not a valid URL
			} catch (e) {
				return {
					success: false,
					message: 'Invalid repository link provided. Please enter a valid URL.'
				};
			}
		}

		// Validate video link if provided
		if (videoLink) {
			try {
				new URL(videoLink); // This will throw an error if not a valid URL
			} catch (e) {
				return {
					success: false,
					message: 'Invalid video link provided. Please enter a valid URL.'
				};
			}
		}

		// 4. CSRF token validation - NOW we can validate because we have the token
		const cookieToken = locals.csrfToken;
		if (!cookieToken || !csrfToken || cookieToken !== csrfToken) {
			return {
				success: false,
				message: 'Invalid security token. Please refresh the page and try again.'
			};
		}

		// 5. Validate file presence
		if (!file || file.size === 0) {
			return {
				success: false,
				message: 'No file provided'
			};
		}

		// 6. Comprehensive file validation
		const validation = await FileUploadSecurity.validatePdfUpload(file);
		if (!validation.valid) {
			return {
				success: false,
				message: validation.error || 'Invalid file'
			};
		}

		// 7. Check team association
		const teamId = locals.user?.team;
		if (!teamId) {
			return {
				success: false,
				message: 'You are not associated with any team'
			};
		}

		// 8. Check if team already has too many presentations (prevent spam)
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

		// 9. Upload file using admin credentials
		try {
			const uploadData = new FormData();
			uploadData.append('team', teamId);
			uploadData.append('presentation', file);
			// Add repo_link if provided
			if (repoLink) {
				uploadData.append('repo_link', repoLink);
			}
			// Add video_link if provided
			if (videoLink) {
				uploadData.append('video_link', videoLink);
			}

			// Use admin client for upload
			const adminClient = new PocketBase('https://hotb-pb.knneuron.pl/');

			// Get credentials from environment variables - ensure they are properly set
			const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
			const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

			// Validate that admin credentials are properly configured
			if (!adminEmail || !adminPassword) {
				console.error(
					'Missing admin credentials in environment variables. Please set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD'
				);
				return {
					success: false,
					message:
						'Server configuration error: Missing admin credentials. Please contact the administrator to set up the required environment variables.'
				};
			}

			await adminClient.collection('_superusers').authWithPassword(adminEmail, adminPassword);
			await adminClient.collection('presentations').create(uploadData);

			return {
				success: true,
				message: 'File uploaded successfully!'
			};
		} catch (err: unknown) {
			console.error('Upload error:', err);

			// Don't expose sensitive error details to the client
			return {
				success: false,
				message: 'An error occurred during upload. Please try again.'
			};
		}
	}
};
