import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error, isHttpError } from '@sveltejs/kit';
import { getResultsState } from '$lib/server/results';
import { getAdminClient } from '$lib/server/adminClient';
import { canJudgeCategory, isAdmin } from '$lib/server/access';
import { recordView } from '$lib/server/views';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Get the specific presentation
	const presentationId = params.id;
	if (!presentationId) {
		throw error(400, 'Presentation ID is required');
	}

	try {
		// Read as superuser, then decide access here (PocketBase rules would hide other teams'
		// records even when the app allows them)
		const pb = await getAdminClient();
		const presentation = await pb.collection('presentations').getOne(presentationId, {
			expand: 'team'
		});
		const category = presentation.expand?.team?.category ?? null;

		// Admins: all; jurors: their categories; team members: their own team;
		// other participants: once the team's category is published
		const allowed =
			isAdmin(locals.user) ||
			canJudgeCategory(locals.user, category) ||
			locals.user.team === presentation.team ||
			(category !== null && (await getResultsState()).publishedCategories.includes(category));

		if (!allowed) {
			// Same answer as a missing record, so ids of other teams can't be probed
			throw error(404, 'Presentation file not found');
		}

		// Get the file name from the presentation record
		// ?file=final: the presentation for the final (stage) instead of the preliminary one
		const isFinal = url.searchParams.get('file') === 'final';
		const fileName = isFinal ? presentation.final_presentation : presentation.presentation;
		if (!fileName) {
			throw error(404, 'Presentation file not found');
		}

		// Jurors opening a team's material is shown to the organizers
		if (locals.user.role === 'jury') {
			void recordView(
				locals.user.id,
				presentation.team,
				isFinal ? 'final_presentation' : 'presentation'
			);
		}

		// Construct the file URL using the authenticated client
		const fileUrl = `${pb.baseURL}/api/files/${presentation.collectionName}/${presentation.id}/${fileName}`;

		// Fetch the file with the authenticated client
		const response = await fetch(fileUrl);

		if (!response.ok) {
			throw error(response.status, 'Could not retrieve presentation file');
		}

		// Get the content type and return the file
		const buffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') || 'application/pdf';

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${fileName}"`
			}
		});
	} catch (err) {
		// Access errors thrown above pass through unchanged
		if (isHttpError(err)) throw err;
		console.error('Error retrieving presentation file:', err);
		if (err instanceof Error && 'status' in err) {
			throw error((err as any).status, (err as any).message);
		} else {
			throw error(500, 'Internal server error');
		}
	}
};
