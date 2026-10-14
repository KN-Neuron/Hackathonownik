import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { audit } from '$lib/server/audit';
import { isAdmin } from '$lib/server/access';
import {
	UNLOCK_COOKIE,
	UNLOCK_MINUTES,
	checkActionPassword,
	createUnlockToken,
	isActionPasswordConfigured,
	unlockLimiter,
	unlockSecret
} from '$lib/server/adminUnlock';

const cookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'strict' as const,
	secure: process.env.NODE_ENV === 'production'
};

// Unlock sensitive admin actions for a few minutes: { password }
export const POST: RequestHandler = async (event) => {
	const { locals, request, url, cookies } = event;
	if (!isAdmin(locals.user)) return json({ error: 'Not authorized' }, { status: 403 });
	// Same-origin requests only (the cookie is SameSite=Strict as well)
	if (request.headers.get('origin') !== url.origin) {
		return json({ error: 'Cross-origin request refused' }, { status: 403 });
	}
	if (!isActionPasswordConfigured()) {
		return json(
			{ error: 'ADMIN_ACTION_PASSWORD is not set in the server environment.' },
			{ status: 503 }
		);
	}

	// Both the account and the address are limited, so one stolen session can't guess forever
	let ip = '';
	try {
		ip = event.getClientAddress();
	} catch {
		ip = 'unknown';
	}
	const keys = [`user:${locals.user!.id}`, `ip:${ip}`];
	const lockedMs = Math.max(...keys.map((k) => unlockLimiter.lockedFor(k)));
	if (lockedMs > 0) {
		await audit(event, 'unlock:blocked', { retryInSeconds: Math.ceil(lockedMs / 1000) }, false);
		return json(
			{ error: `Too many wrong passwords. Try again in ${Math.ceil(lockedMs / 60_000)} min.` },
			{ status: 429 }
		);
	}

	const body = await request.json().catch(() => null);
	const password = typeof body?.password === 'string' ? body.password : '';

	if (!checkActionPassword(password)) {
		keys.forEach((k) => unlockLimiter.fail(k));
		await audit(event, 'unlock:wrong-password', {}, false);
		return json({ error: 'Wrong password.' }, { status: 403 });
	}

	keys.forEach((k) => unlockLimiter.succeed(k));
	const token = createUnlockToken(locals.user!.id, unlockSecret());
	cookies.set(UNLOCK_COOKIE, token, { ...cookieOptions, maxAge: UNLOCK_MINUTES * 60 });
	await audit(event, 'unlock', { minutes: UNLOCK_MINUTES });
	return json({ success: true, minutes: UNLOCK_MINUTES });
};

// Lock again right away
export const DELETE: RequestHandler = async (event) => {
	const { locals, request, url, cookies } = event;
	if (!isAdmin(locals.user)) return json({ error: 'Not authorized' }, { status: 403 });
	if (request.headers.get('origin') !== url.origin) {
		return json({ error: 'Cross-origin request refused' }, { status: 403 });
	}
	cookies.delete(UNLOCK_COOKIE, cookieOptions);
	await audit(event, 'lock');
	return json({ success: true });
};
