import type { TypedPocketBase } from '$lib/types'
import type { Handle } from '@sveltejs/kit'
import { paraglideMiddleware } from '$lib/paraglide/server';

import { dev } from '$app/environment'
import { env } from '$env/dynamic/public'
import { Security } from '$lib/pocketbase.svelte'
import PocketBase from 'pocketbase'

// FIXME: fix and use this middleware
// const handleParaglide: Handle = ({ event, resolve }) =>
//     paraglideMiddleware(event.request, ({ request, locale }) => {
//         event.request = request;
//
//         return resolve(event, {
//             transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
//         });
//     });

export const handle: Handle = async ({ event, resolve }) => {
    // FIXME: get this url from env. security. SECURITY.
    event.locals.pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase
    event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '')

    // dev && console.log('hooks.server: ', locals.pb.authStore.model);
    try {
        if (event.locals.pb.authStore.isValid) {
            await event.locals.pb.collection('users').authRefresh()
            event.locals.user = event.locals.pb.authStore.model
        }
    } catch (err) {
        console.error('Error during PocketBase .authRefresh():', err) // Log the error
        event.locals.pb.authStore.clear()
        event.locals.user = null
    }

    // Must always run, but be after .loadFromCookie() & .authRefresh()
    event.locals.security = new Security(event)

    const response = await resolve(event)

    // httpOnly = false is required for realtime to get the cookie (see verify/+page.svelte)
    response.headers.set(
        'set-cookie',
        event.locals.pb.authStore.exportToCookie({ httpOnly: false, sameSite: 'Lax', secure: !dev }),
    )
    return response
}

