import type { RequestEvent } from '@sveltejs/kit';
import { getAdminClient } from './adminClient';

// Superuser-only collection: who did what in the admin area
const AUDIT_COLLECTION = 'admin_audit';

export interface AuditEntry {
	id: string;
	at: string;
	adminEmail: string;
	action: string;
	ok: boolean;
	ip: string;
	details: Record<string, unknown>;
}

/**
 * Write one line of the audit log. Best effort: a failing log must not block the organizers in
 * the middle of the event, so errors only go to the server log.
 */
export async function audit(
	event: Pick<RequestEvent, 'locals' | 'getClientAddress'>,
	action: string,
	details: Record<string, unknown> = {},
	ok = true
): Promise<void> {
	const user = event.locals.user;
	let ip = '';
	try {
		ip = event.getClientAddress();
	} catch {
		// no client address (tests, some adapters)
	}
	try {
		const pb = await getAdminClient();
		await pb.collection(AUDIT_COLLECTION).create({
			admin: user?.id || undefined,
			admin_email: user?.email ?? '',
			action,
			ok,
			ip,
			details
		});
	} catch (e) {
		console.error('Could not write the audit log:', action, details, e);
	}
}

export async function getAuditLog(limit = 300): Promise<AuditEntry[]> {
	const pb = await getAdminClient();
	const { items } = await pb.collection(AUDIT_COLLECTION).getList(1, limit, { sort: '-created' });
	return items.map((r) => ({
		id: r.id,
		at: r.created,
		adminEmail: r.admin_email,
		action: r.action,
		ok: r.ok !== false,
		ip: r.ip,
		details: r.details && typeof r.details === 'object' ? r.details : {}
	}));
}
