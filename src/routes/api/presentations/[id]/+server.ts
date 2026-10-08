import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { areResultsPublic } from '$lib/server/access';

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

	try {
		const presentation = await locals.pb.collection('presentations').getOne(presentationId, {
			expand: 'team'
		});

		// Access Control Logic
		// 1. Admins and Juries always have access
		const isJuryOrAdmin = locals.user.role === 'jury' || locals.user.role === 'admin' || locals.user.admin;
		
		// 2. Team members have access to their OWN presentations
		const isOwnTeamPresentation = locals.user.team === presentation.team;

		if (!isJuryOrAdmin && !isOwnTeamPresentation) {
			// 3. Other participants get access only once results are published
			if (!(await areResultsPublic())) {
				throw error(403, 'Presentations not yet publicly available');
			}
		}

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