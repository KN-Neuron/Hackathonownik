import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Get the specific presentation
	const presentationId = params.id;
	if (!presentationId) {
		throw error(400, 'Presentation ID is required');
	}

	// Check if user is a jury member or admin (they can always access)
	if (locals.user.role !== 'jury' && !locals.user.admin) {
		// For participants, check if all teams have been rated
		try {
			const presentations = await locals.pb.collection('presentations').getFullList();
			if (presentations.length === 0) {
				throw error(403, 'No presentations available');
			}

			const ratings = await locals.pb.collection('ratings').getFullList();
			if (ratings.length === 0) {
				throw error(403, 'Presentations not yet available');
			}

			const presentationIds = presentations.map((p) => p.id);
			const ratedPresentationIds = new Set(ratings.map((r) => r.presentation));

			// If not all presentations have been rated, don't allow access
			if (!presentationIds.every((id) => ratedPresentationIds.has(id))) {
				throw error(403, 'Presentations not yet available');
			}
		} catch (err) {
			console.error('Error checking access for participant:', err);
			throw error(403, 'Access not authorized');
		}
	}

	try {
		const presentation = await locals.pb.collection('presentations').getOne(presentationId, {
			expand: 'team'
		});

		// Get the file name from the presentation record
		const fileName = presentation.presentation;
		if (!fileName) {
			throw error(404, 'Presentation file not found');
		}

		// Construct the file URL using the authenticated client
		const fileUrl = `${locals.pb.baseUrl}/api/files/${presentation.collectionName}/${presentation.id}/${fileName}`;
		
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
				'Content-Disposition': `inline; filename="${fileName}"`,
			}
		});
	} catch (err) {
		console.error('Error retrieving presentation file:', err);
		if (err instanceof Error && 'status' in err) {
			throw error((err as any).status, (err as any).message);
		} else {
			throw error(500, 'Internal server error');
		}
	}
};