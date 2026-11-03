/**
 * Tiny in-process cache for data that hundreds of users read at the same moment (results state,
 * rating progress, rankings). Concurrent callers share one pending request, entries live for a
 * couple of seconds, and every write that changes the data invalidates it right away.
 *
 * With several app processes each one has its own cache, so another process may serve data that
 * is up to `ttlMs` old.
 */
const store = new Map<string, { expires: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = store.get(key);
	if (hit && hit.expires > now) {
		return hit.value as Promise<T>;
	}

	const value = load();
	store.set(key, { expires: now + ttlMs, value });
	// Never keep a failure around
	value.catch(() => {
		if (store.get(key)?.value === value) store.delete(key);
	});
	return value;
}

/** Drop every entry whose key starts with one of the prefixes. */
export function invalidate(...prefixes: string[]): void {
	for (const key of store.keys()) {
		if (prefixes.some((prefix) => key.startsWith(prefix))) store.delete(key);
	}
}

export const CACHE_TTL_MS = 2000;
