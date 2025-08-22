import PocketBase, { ClientResponseError } from 'pocketbase';
import type { TypedPocketBase, User } from '$lib/types'
import { browser, dev } from '$app/environment'
import { redirect, error, type RequestEvent } from '@sveltejs/kit'
import { env } from '$env/dynamic/public'

export const pbError = (e: unknown) => {
    const err = e as ClientResponseError
    if (dev) console.log(err?.response)
    error(err?.status, err?.response?.message)
}

function createPocketBase(): TypedPocketBase {
    // FIXME: get this url from env. security. SECURITY.
    const pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase
    if (browser) {
        pb.authStore.loadFromCookie(document.cookie)
    }
    return pb
}

export const pb = $state(createPocketBase())

export class Security {
    // TODO: What if you forget to call any of the security methods in a server load function? Oh noes!
    // To protect against this you could set a flag in the security class whenever a check has been made,
    // then check if any request with the event.isDataRequest set to true has been made without the flag
    // being set and output a warning (at least in dev mode) or throw an exception (rather than risk
    // accidentally exposing some data).

    private readonly user: User | null

    constructor(private readonly event: RequestEvent) {
        this.user = event.locals.user || null
    }

    isAuthenticated() {
        if (!this.user) {
            // redirect(303, '/sign/in')
            error(401, 'You are not signed in.')
        }
        // if (!this.user?.verified) {
        //     redirect(303, '/')
        //     // error(403, "Your account's email address has not been verified")
        // }
        return this
    }

    isAdmin() {
        // Requires that you add admin to pb.collection('users')
        this.isAuthenticated()

        if (this.user && !this.user?.admin) {
            error(403, 'Your account is not an administrator.')
        }
        return this
    }

    // https://www.captaincodeman.com/securing-your-sveltekit-app
    // isProjectOwner(project: Project) {
    //   if (!this.user || !project.owners.includes(this.user.uid)) {
    //     error(403, 'not project owner')
    //   }
    //   return this
    // }
}

