import type { Handle } from '@sveltejs/kit';
import type { TypedPocketBase } from '$lib/types';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/public'; // or use $env/dynamic/private if the URL must NOT be public
import { paraglideMiddleware } from '$lib/paraglide/server';
import { Security } from '$lib/pocketbase.svelte';
import PocketBase from 'pocketbase';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * PocketBase + Security middleware
 */
const handlePocketBase: Handle = async ({ event, resolve }) => {
    // Get URL from env (FAIL FAST if missing)
    // FIXME: get from env (temporary using hard coded string)
    // const pbUrl = env.PUBLIC_POCKETBASE_URL; // rename if needed
    const pbUrl = "https://frog01-32147.wykr.es/";
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

    // Must run after auth store setup
    event.locals.security = new Security(event);

    const response = await resolve(event);

    // httpOnly = false is required for realtime (see verify/+page.svelte)
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

/**
 * Paraglide (i18n) middleware
 *
 * It wraps the request to determine locale and injects it into the HTML.
 */
const handleParaglide: Handle = async ({ event, resolve }) => {
    return paraglideMiddleware(event.request, ({ request, locale }) => {
        // Update the event's request so downstream code sees the localized one (if modified)
        event.request = request;

        return resolve(event, {
            transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
        });
    });
};

/**
 * Export the composed handle.
 * Order matters:
 *  - PocketBase first so that auth/security are ready for any load functions.
 *  - Paraglide second so its transformPageChunk runs on the final HTML.
 *
 * (PocketBase still sets cookies because it executes AFTER its inner resolve finishes.)
 */
export const handle: Handle = sequence(handlePocketBase, handleParaglide);
