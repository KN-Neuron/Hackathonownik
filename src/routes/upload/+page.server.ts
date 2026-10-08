import { FileUploadSecurity } from '$lib/server/security.js';
import type { Actions, PageServerLoad } from './$types';
import 'dotenv/config';
import { appConfig, requiredFor } from '$lib/server/appConfig';
import { getTeamSubmission, invalidateSubmissions } from '$lib/server/submissions';
import { getAdminClient } from '$lib/server/adminClient';
import { getResultsState, stageOf } from '$lib/server/results';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	try {
		locals.security.isAuthenticated();
	} catch (e: any) {
		// Redirect to login if not authenticated
		throw e;
	}

	const teamId = locals.user?.team;
	if (!teamId) {
		return {
			csrfToken: locals.csrfToken,
			hasTeam: false,
			submission: null,
			teamName: null,
			required: []
		};
	}

	const pb = await getAdminClient();
	const [submission, team, state] = await Promise.all([
		getTeamSubmission(teamId).catch((e) => {
			console.error('Error fetching team submission:', e);
			return null;
		}),
		pb.collection('teams').getOne(teamId, { fields: 'name,category' }),
		getResultsState()
	]);

	return {
		csrfToken: locals.csrfToken,
		hasTeam: true,
		submission,
		teamName: team.name as string,
		// What this team's category requires
		required: requiredFor(team.category),
		inFinal: Boolean(
			team.category &&
				stageOf(state, team.category) === 'final' &&
				state.finalists[team.category]?.includes(teamId)
		)
	};
};

/** '' when empty, null when it can't be a web address, otherwise the address with https:// */
function normalizeLink(value: FormDataEntryValue | null): string | null {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) return '';
	const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
	try {
		const url = new URL(withProtocol);
		return url.hostname.includes('.') ? url.toString() : null;
	} catch {
		return null;
	}
}

function slugify(text: string): string {
	return (
		text
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/ł/g, 'l')
			.replace(/Ł/g, 'L')
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase() || 'team'
	);
}

/** PDFs are stored as "<team-name>.pdf", whatever the participant's file was called. */
async function teamFileName(teamId: string): Promise<string> {
	try {
		const pb = await getAdminClient();
		const team = await pb.collection('teams').getOne(teamId, { fields: 'name' });
		return `${slugify(team.name)}.pdf`;
	} catch {
		return 'presentation.pdf';
	}
}

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		// 1. Deadlines: the final presentation may come later than everything else
		const now = new Date();
		const mainClosed = now > new Date(appConfig.event.deadline);
		const finalClosed = now > new Date(appConfig.event.final_presentation_deadline);
		if (mainClosed && finalClosed) {
			return { success: false, message: 'The submission deadline has passed.' };
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
		const uploaded = formData.get('file');
		const uploadedFinal = formData.get('final_file');
		const csrfToken = formData.get('csrf_token') as string;

		// Accept links typed without the protocol ("github.com/team/repo")
		const repoLink = normalizeLink(formData.get('repo_link'));
		const videoLink = normalizeLink(formData.get('video_link'));
		if (repoLink === null) {
			return {
				success: false,
				message:
					"The repository link doesn't look like a web address, e.g. https://github.com/your-team/project"
			};
		}
		if (videoLink === null) {
			return {
				success: false,
				message: "The video link doesn't look like a web address, e.g. https://youtu.be/…"
			};
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
		const hasFile = uploaded instanceof File && uploaded.size > 0;
		const hasFinalFile = uploadedFinal instanceof File && uploadedFinal.size > 0;
		if (mainClosed && (hasFile || repoLink || videoLink)) {
			return {
				success: false,
				message: 'The deadline has passed; only the final presentation can still be uploaded.'
			};
		}
		if (finalClosed && hasFinalFile) {
			return { success: false, message: 'The deadline for the final presentation has passed.' };
		}

		// 6. Content check (PDF signature, size). The original name doesn't matter: spaces or
		// Polish letters shouldn't block anyone, so the file gets a safe name of the team.
		const checkPdf = async (upload: File) => {
			const pdf = new File([upload], 'presentation.pdf', { type: 'application/pdf' });
			const validation = await FileUploadSecurity.validatePdfUpload(pdf);
			if (validation.valid) return { pdf };
			return {
				error:
					validation.error === 'File is not a valid PDF'
						? 'This file is not a PDF. Export your presentation as PDF and try again.'
						: validation.error || 'Invalid file'
			};
		};
		let file: File | null = null;
		let finalFile: File | null = null;
		for (const [upload, set] of [
			[hasFile ? (uploaded as File) : null, (f: File) => (file = f)],
			[hasFinalFile ? (uploadedFinal as File) : null, (f: File) => (finalFile = f)]
		] as const) {
			if (!upload) continue;
			const checked = await checkPdf(upload);
			if ('error' in checked) return { success: false, message: checked.error };
			set(checked.pdf);
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

		if (!hasFile && !hasFinalFile && !newRepoLink && !newVideoLink) {
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
			if (file) {
				uploadData.append('presentation', file, await teamFileName(teamId));
			}
			if (finalFile) {
				uploadData.append(
					'final_presentation',
					finalFile,
					(await teamFileName(teamId)).replace(/\.pdf$/, '-final.pdf')
				);
			}
			if (newRepoLink) {
				uploadData.append('repo_link', newRepoLink);
			}
			if (newVideoLink) {
				uploadData.append('video_link', newVideoLink);
			}

			const adminClient = await getAdminClient();
			await adminClient.collection('presentations').create(uploadData);
			invalidateSubmissions();

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
