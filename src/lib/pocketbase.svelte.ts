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
    
    const pb = new PocketBase('https://frog01-32147.wykr.es/') as TypedPocketBase
    if (browser) {
        pb.authStore.loadFromCookie(document.cookie)
    }
    return pb
}

export const pb = $state(createPocketBase())

export class Security {
    
    
    
    
    

    private readonly user: User | null

    constructor(private readonly event: RequestEvent) {
        this.user = event.locals.user || null
    }

    isAuthenticated() {
        if (!this.user) {
            
            error(401, 'You are not signed in.')
        }
        
        
        
        
        return this
    }

    isAdmin() {
        
        this.isAuthenticated()

        if (this.user && !this.user?.admin) {
            error(403, 'Your account is not an administrator.')
        }
        return this
    }
}

