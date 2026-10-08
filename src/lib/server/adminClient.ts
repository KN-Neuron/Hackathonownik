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
	const login = () => pb.collection('_superusers').authWithPassword(email, password);

	// A rejected token (password change, revoked session, new database) logs in again and retries
	// the request once; a valid superuser never gets 401/403, PocketBase answers both for a bad token
	const send = pb.send.bind(pb);
	pb.send = async (path, options) => {
		try {
			return await send(path, options);
		} catch (e) {
			const status = (e as { status?: number }).status;
			if ((status !== 401 && status !== 403) || path.includes('auth-with-password')) throw e;
			await login();
			return send(path, options);
		}
	};

	await login();
	client = pb;
	return pb;
}
