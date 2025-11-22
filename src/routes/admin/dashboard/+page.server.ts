import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { InputValidator } from '$lib/server/security';

export const load: PageServerLoad = async ({ locals }) => {
	// Tylko admini
	try {
		locals.security.isAdmin();
	} catch (e) {
		throw error(403, 'Admin access required');
	}

	// Rate limit dla admin actions (limity zdefiniowane w konfiguracji rate limitera)
	locals.security.checkRateLimit('api');

	try {
		// Pobierz wszystkie dane dla admin panelu
		const [users, teams, presentations, ratings] = await Promise.all([
			locals.pb.collection('users').getFullList(),
			locals.pb.collection('teams').getFullList(),
			locals.pb.collection('presentations').getFullList({ expand: 'team' }),
			locals.pb.collection('ratings').getFullList({ expand: 'jury,presentation' })
		]);

		return {
			users,
			teams,
			presentations,
			ratings,
			user: locals.user,
			csrfToken: locals.csrfToken
		};
	} catch (e) {
		console.error('Error loading admin data:', e);
		throw error(500, 'Could not load admin data');
	}
};

export const actions: Actions = {
	// Delete presentation (tylko admin)
	deletePresentation: async ({ locals, request }) => {
		try {
			locals.security.isAdmin().validateCSRF();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized'
			};
		}

		const formData = await request.formData();
		const presentationId = formData.get('presentation_id') as string;
		const csrfToken = formData.get('csrf_token') as string;

		// Validate CSRF
		if (!locals.csrfToken || locals.csrfToken !== csrfToken) {
			return {
				success: false,
				message: 'Invalid security token'
			};
		}

		if (!presentationId) {
			return {
				success: false,
				message: 'Missing presentation ID'
			};
		}

		// Sanitize ID
		const sanitizedId = InputValidator.sanitizeSql(presentationId.trim());

		try {
			await locals.pb.collection('presentations').delete(sanitizedId);
			return {
				success: true,
				message: 'Presentation deleted successfully'
			};
		} catch (e) {
			console.error('Error deleting presentation:', e);
			return {
				success: false,
				message: 'Could not delete presentation'
			};
		}
	},

	// Update user role (tylko admin)
	updateUserRole: async ({ locals, request }) => {
		try {
			locals.security.isAdmin().validateCSRF();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized'
			};
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const newRole = formData.get('role') as string;
		const csrfToken = formData.get('csrf_token') as string;

		// Validate CSRF
		if (!locals.csrfToken || locals.csrfToken !== csrfToken) {
			return {
				success: false,
				message: 'Invalid security token'
			};
		}

		// Input validation
		if (!userId || !newRole) {
			return {
				success: false,
				message: 'Missing required fields'
			};
		}

		// Validate role (tylko dozwolone wartości)
		const allowedRoles = ['participant', 'jury', 'admin'];
		if (!allowedRoles.includes(newRole)) {
			return {
				success: false,
				message: 'Invalid role'
			};
		}

		// Nie pozwól adminowi zmienić własnej roli
		if (userId === locals.user?.id) {
			return {
				success: false,
				message: 'Cannot change your own role'
			};
		}

		try {
			await locals.pb.collection('users').update(userId, {
				role: newRole,
				admin: newRole === 'admin'
			});

			return {
				success: true,
				message: 'User role updated successfully'
			};
		} catch (e) {
			console.error('Error updating user role:', e);
			return {
				success: false,
				message: 'Could not update user role'
			};
		}
	},

	// Bulk delete ratings (do czyszczenia spamu)
	bulkDeleteRatings: async ({ locals, request }) => {
		try {
			locals.security.isAdmin().validateCSRF();
		} catch (e: any) {
			return {
				success: false,
				message: e.body?.message || 'Unauthorized'
			};
		}

		const formData = await request.formData();
		const ratingIds = formData.getAll('rating_ids[]') as string[];
		const csrfToken = formData.get('csrf_token') as string;

		// Validate CSRF
		if (!locals.csrfToken || locals.csrfToken !== csrfToken) {
			return {
				success: false,
				message: 'Invalid security token'
			};
		}

		if (!ratingIds || ratingIds.length === 0) {
			return {
				success: false,
				message: 'No ratings selected'
			};
		}

		// Limit bulk operations
		if (ratingIds.length > 100) {
			return {
				success: false,
				message: 'Cannot delete more than 100 ratings at once'
			};
		}

		try {
			// Delete w batch (bezpieczniejsze niż pojedyncze requesty)
			const deletePromises = ratingIds.map((id) =>
				locals.pb.collection('ratings').delete(InputValidator.sanitizeSql(id.trim()))
			);

			await Promise.all(deletePromises);

			return {
				success: true,
				message: `Successfully deleted ${ratingIds.length} ratings`
			};
		} catch (e) {
			console.error('Error bulk deleting ratings:', e);
			return {
				success: false,
				message: 'Could not delete ratings'
			};
		}
	}
};
