import 'dotenv/config';
import PocketBase from 'pocketbase';

export const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://hotb-pb.knneuron.pl/';

let client: PocketBase | null = null;

/**
 * PocketBase client authenticated as superuser, for data that users must never reach directly
 * (results state, private jury notes, uploads). Access checks are the caller's job.
 */
export async function getAdminClient(): Promise<PocketBase> {
	if (client?.authStore.isValid) {
		return client;
	}

	const email = process.env.POCKETBASE_ADMIN_EMAIL;
	const password = process.env.POCKETBASE_ADMIN_PASSWORD;
	if (!email || !password) {
		throw new Error(
			'Missing admin credentials. Please set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD'
		);
	}

	const pb = new PocketBase(POCKETBASE_URL);
	pb.autoCancellation(false);
	await pb.collection('_superusers').authWithPassword(email, password);
	client = pb;
	return pb;
}
