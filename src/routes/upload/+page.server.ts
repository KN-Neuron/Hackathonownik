import { FileUploadSecurity } from '$lib/server/security.js';
import type { Actions, PageServerLoad } from './$types';
import 'dotenv/config';
import { appConfig, requiredFor } from '$lib/server/appConfig';
import { getTeamCategory } from '$lib/server/access';
import { getTeamSubmission } from '$lib/server/submissions';
import { getAdminClient } from '$lib/server/adminClient';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	try {
		locals.security.isAuthenticated();
	} catch (e: any) {
		// Redirect to login if not authenticated
		throw e;
	}

	const teamId = locals.user?.team;
	let submission = null;
	if (teamId) {
		try {
			submission = await getTeamSubmission(teamId);
		} catch (e) {
			console.error('Error fetching team submission:', e);
		}
	}

	// Return CSRF token for the form
	return {
		csrfToken: locals.csrfToken,
		hasTeam: Boolean(teamId),
		submission,
		// What this team's category requires
		required: requiredFor(teamId ? await getTeamCategory(teamId) : null)
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		// 1. Check deadline
		const deadline = new Date(appConfig.event.deadline);
		const now = new Date();
		if (now > deadline) {
			return {
				success: false,
				message: `Submission deadline has passed. Presentations can no longer be submitted after ${deadline.toLocaleString()}.`
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
		const repoLink = ((formData.get('repo_link') as string) || '').trim();
		const videoLink = ((formData.get('video_link') as string) || '').trim();
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

		// 5. Every item is optional on its own
		const hasFile = file instanceof File && file.size > 0;

		// 6. Comprehensive file validation
		if (hasFile) {
			const validation = await FileUploadSecurity.validatePdfUpload(file);
			if (!validation.valid) {
				return {
					success: false,
					message: validation.error || 'Invalid file'
				};
			}
		}

		// 7. Check team association
		const teamId = locals.user?.team;
		if (!teamId) {
			return {
				success: false,
				message: 'You are not associated with any team'
			};
		}

		// 8. Skip links that didn't change, so they keep their original author
		let current = null;
		try {
			current = await getTeamSubmission(teamId);
		} catch (e) {
			console.error('Error fetching team submission:', e);
		}
		const newRepoLink = repoLink && repoLink !== current?.repo?.url ? repoLink : '';
		const newVideoLink = videoLink && videoLink !== current?.video?.url ? videoLink : '';

		if (!hasFile && !newRepoLink && !newVideoLink) {
			return {
				success: false,
				message: 'Nothing new to save. Add a PDF or change one of the links.'
			};
		}

		// 9. Save only the new items; the jury sees the newest version of each item
		try {
			const uploadData = new FormData();
			uploadData.append('team', teamId);
			uploadData.append('submitted_by', locals.user.id);
			if (hasFile) {
				uploadData.append('presentation', file);
			}
			if (newRepoLink) {
				uploadData.append('repo_link', newRepoLink);
			}
			if (newVideoLink) {
				uploadData.append('video_link', newVideoLink);
			}

			const adminClient = await getAdminClient();
			await adminClient.collection('presentations').create(uploadData);

			return {
				success: true,
				message: 'Submission saved!'
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
