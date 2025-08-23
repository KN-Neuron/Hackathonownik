import type { Handle } from '@sveltejs/kit';
import type { TypedPocketBase } from '$lib/types';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { Security } from '$lib/pocketbase.svelte';
import PocketBase from 'pocketbase';
import { sequence } from '@sveltejs/kit/hooks';

const handlePocketBase: Handle = async ({ event, resolve }) => {
	const pbUrl = env.PUBLIC_POCKETBASE_URL;

	if (!pbUrl) {
		console.error('Missing env.PUBLIC_POCKETBASE_URL');
		throw new Error('PocketBase URL is not configured');
	}

	event.locals.pb = new PocketBase(pbUrl) as TypedPocketBase;
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = event.locals.pb.authStore.model;
		} else {
			event.locals.user = null;
		}
	} catch (err) {
		console.error('Error during PocketBase authRefresh():', err);
		event.locals.pb.authStore.clear();
		event.locals.user = null;
	}

	event.locals.security = new Security(event);

	const response = await resolve(event);

	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			httpOnly: false,
			sameSite: 'Lax',
			secure: !dev
		})
	);

	return response;
};

const handleParaglide: Handle = async ({ event, resolve }) => {
	return paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});
};

export const handle: Handle = sequence(handlePocketBase, handleParaglide);
