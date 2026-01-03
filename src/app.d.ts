import type PocketBase from 'pocketbase';
import type { Record, Admin } from 'pocketbase';
import type { Security } from '$lib/server/security';

declare global {
	namespace App {
		interface Locals {
			pb: PocketBase;
			user: Admin | Record | null;
			security: Security;
			csrfToken?: string;
		}

		interface PageData {
			csrfToken?: string;
		}

		// Error shape
		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
