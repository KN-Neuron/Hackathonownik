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
			// 3. For other participants, access is only allowed if ALL teams are rated
			try {
				const allPresentations = await locals.pb.collection('presentations').getFullList();
				// Use Set for unique team IDs, as multiple presentations can exist per team
				const allTeamIds = new Set(allPresentations.map(p => p.team));
				
				const ratings = await locals.pb.collection('ratings').getFullList();
				const ratedTeamIds = new Set(ratings.map((r) => r.team));

				// Check if every team has at least one rating
				const allTeamsRated = Array.from(allTeamIds).every(teamId => ratedTeamIds.has(teamId));

				if (!allTeamsRated) {
					throw error(403, 'Presentations not yet publicly available');
				}
			} catch (err) {
				// If checking fails or throws 403, propagate the error
				if (err instanceof Error && 'status' in err && (err as any).status === 403) {
					throw err;
				}
				console.error('Error checking global access:', err);
				throw error(403, 'Access not authorized');
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