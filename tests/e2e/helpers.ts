import 'dotenv/config';
import PocketBase from 'pocketbase';
import { unflatten } from 'devalue';

export const APP_URL = process.env.APP_URL || 'http://localhost:4174';
export const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
export const PASSWORD = 'E2e-test-password-1';
export const ACTION_PASSWORD = process.env.ADMIN_ACTION_PASSWORD || '';

/** A tiny browser: keeps cookies, logs in, calls pages, JSON endpoints and form actions. */
export class AppClient {
	cookies = new Map<string, string>();

	private store(res: Response) {
		for (const cookie of res.headers.getSetCookie?.() ?? []) {
			const [pair] = cookie.split(';');
			const i = pair.indexOf('=');
			const name = pair.slice(0, i);
			const value = pair.slice(i + 1);
			// An expired cookie is a deletion
			if (/max-age=0|expires=thu, 01 jan 1970/i.test(cookie) || value === '')
				this.cookies.delete(name);
			else this.cookies.set(name, value);
		}
	}

	cookieHeader() {
		return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
	}

	async request(path: string, init: RequestInit & { origin?: string | null } = {}) {
		const { origin = APP_URL, headers, ...rest } = init;
		const res = await fetch(APP_URL + path, {
			redirect: 'manual',
			...rest,
			headers: {
				cookie: this.cookieHeader(),
				...(origin ? { origin } : {}),
				...(headers as Record<string, string>)
			}
		});
		this.store(res);
		return res;
	}

	/** Status of a GET; redirects count as their own status (303 …). */
	async status(path: string) {
		return (await this.request(path)).status;
	}

	async login(email: string, password = PASSWORD) {
		const res = await this.request('/login', {
			method: 'POST',
			body: new URLSearchParams({ email, password }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		const body = await res.json();
		if (body.type !== 'redirect')
			throw new Error(`login failed for ${email}: ${JSON.stringify(body)}`);
		return this;
	}

	/** Server-side load data of a page, fully decoded: [layoutData, pageData]. */
	async data(path: string): Promise<{ status: number; layout: any; page: any }> {
		const [pathname, query] = path.split('?');
		const res = await this.request(
			`${pathname.replace(/\/$/, '')}/__data.json${query ? `?${query}` : ''}`
		);
		if (res.status !== 200) return { status: res.status, layout: null, page: null };
		const json = await res.json();
		// A load that redirects answers with { type: 'redirect' } instead of nodes
		if (!json.nodes) return { status: 303, layout: null, page: null };
		const node = (i: number) =>
			json.nodes[i]?.type === 'data' ? unflatten(json.nodes[i].data) : null;
		return { status: 200, layout: node(0), page: node(1) };
	}

	async csrf(): Promise<string> {
		return (await this.data('/')).layout?.csrfToken;
	}

	/** POST a SvelteKit form action; resolves to { type, data, status } of the action result. */
	async action(
		path: string,
		fields: Record<string, string | string[]> = {},
		files: Record<string, File> = {}
	) {
		const form = new FormData();
		form.append('csrf_token', (fields.csrf_token as string) ?? (await this.csrf()));
		for (const [key, value] of Object.entries(fields)) {
			if (key === 'csrf_token') continue;
			for (const v of [value].flat()) form.append(key, v);
		}
		for (const [key, file] of Object.entries(files)) form.append(key, file);
		const res = await this.request(path, {
			method: 'POST',
			body: form,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const body = await res.json().catch(() => ({}));
		return {
			status: res.status,
			type: body.type as string,
			data: body.data ? (unflatten(JSON.parse(body.data)) as any) : null,
			location: body.location as string | undefined
		};
	}

	async json(
		path: string,
		method = 'GET',
		body?: unknown,
		extraHeaders: Record<string, string> = {}
	) {
		const res = await this.request(path, {
			method,
			body: body === undefined ? undefined : JSON.stringify(body),
			headers: { 'content-type': 'application/json', ...extraHeaders }
		});
		return { status: res.status, body: await res.json().catch(() => null) };
	}

	/** Unlock the admin's sensitive actions with the action password. */
	async unlock(password = ACTION_PASSWORD) {
		return this.json('/api/admin/unlock', 'POST', { password });
	}
}

/** Minimal valid PDF (one page). */
export function pdfFile(name = 'slides.pdf') {
	return new File(
		[
			'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
		],
		name,
		{ type: 'application/pdf' }
	);
}

export async function adminPb() {
	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);
	await pb
		.collection('_superusers')
		.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
	return pb;
}

export type World = Awaited<ReturnType<typeof buildWorld>>;

/**
 * Creates a small event: 3 teams (2 in "adaptive", 1 in "fnirs") with a submission each, two
 * participants in the first team, jurors for both categories, a juror of both, and two admins.
 * Everything is deleted again by world.cleanup().
 */
export async function buildWorld() {
	const pb = await adminPb();
	const tag = Math.random().toString(36).slice(2, 7);
	const created: { collection: string; id: string }[] = [];
	const make = async (collection: string, data: Record<string, unknown> | FormData) => {
		const record = await pb.collection(collection).create(data);
		created.push({ collection, id: record.id });
		return record;
	};
	const user = (name: string, extra: Record<string, unknown>) =>
		make('users', {
			email: `e2e-${tag}-${name}@example.test`,
			name: `E2E ${name} ${tag}`,
			password: PASSWORD,
			passwordConfirm: PASSWORD,
			verified: true,
			...extra
		});

	// The shared event state is restored afterwards
	const stateBefore = (await pb.collection('event_state').getFullList())[0] ?? null;

	const alpha = await make('teams', { name: `E2E Alpha ${tag}`, category: 'adaptive' });
	const beta = await make('teams', { name: `E2E Beta ${tag}`, category: 'adaptive' });
	const gamma = await make('teams', { name: `E2E Gamma ${tag}`, category: 'fnirs' });

	const w = {
		pb,
		tag,
		teams: { alpha, beta, gamma },
		users: {
			alice: await user('alice', { role: 'participant', team: alpha.id }),
			bob: await user('bob', { role: 'participant', team: alpha.id }),
			carol: await user('carol', { role: 'participant', team: beta.id }),
			gina: await user('gina', { role: 'participant', team: gamma.id }),
			loner: await user('loner', { role: 'participant' }),
			juryA1: await user('juryA1', { role: 'jury', jury_categories: ['adaptive'] }),
			juryA2: await user('juryA2', { role: 'jury', jury_categories: ['adaptive'] }),
			juryF: await user('juryF', { role: 'jury', jury_categories: ['fnirs'] }),
			juryBoth: await user('juryBoth', { role: 'jury', jury_categories: ['adaptive', 'fnirs'] }),
			juryNone: await user('juryNone', { role: 'jury', jury_categories: [] }),
			admin: await user('admin', { role: 'admin' }),
			admin2: await user('admin2', { role: 'admin' })
		},
		email: (name: string) => `e2e-${tag}-${name}@example.test`,
		clients: new Map<string, AppClient>(),
		/** Logged-in client of a fixture user (cached). */
		async as(name: keyof World['users']) {
			if (!w.clients.has(name)) w.clients.set(name, await new AppClient().login(w.email(name)));
			return w.clients.get(name)!;
		},
		anon: () => new AppClient(),
		make,
		async cleanup() {
			// Records that point at users and teams go first, then the fixtures newest first
			const ours = new Set([alpha.id, beta.id, gamma.id]);
			for (const collection of ['ratings', 'jury_notes', 'jury_views', 'presentations']) {
				const rows = await pb.collection(collection).getFullList({ fields: 'id,team' });
				await Promise.all(
					rows
						.filter((r) => ours.has(r.team))
						.map((r) =>
							pb
								.collection(collection)
								.delete(r.id)
								.catch(() => {})
						)
				);
			}
			const audits = await pb.collection('admin_audit').getFullList({ fields: 'id,admin_email' });
			await Promise.all(
				audits
					.filter((a) => String(a.admin_email).includes(`e2e-${tag}`))
					.map((a) =>
						pb
							.collection('admin_audit')
							.delete(a.id)
							.catch(() => {})
					)
			);
			for (const { collection, id } of [...created].reverse()) {
				await pb
					.collection(collection)
					.delete(id)
					.catch(() => {});
			}
			const [state] = await pb.collection('event_state').getFullList();
			if (state && stateBefore) await pb.collection('event_state').update(state.id, stateBefore);
			else if (state) await pb.collection('event_state').delete(state.id);
		}
	};

	// One submission per team, made by a member
	for (const [name, team, member] of [
		['alpha', alpha, w.users.alice],
		['beta', beta, w.users.carol],
		['gamma', gamma, w.users.gina]
	] as const) {
		const form = new FormData();
		form.append('team', team.id);
		form.append('submitted_by', member.id);
		form.append('presentation', pdfFile(`${name}.pdf`));
		form.append('repo_link', `https://github.com/e2e/${name}`);
		form.append('video_link', 'https://youtu.be/dQw4w9WgXcQ');
		await make('presentations', form);
	}
	// The app caches progress and rankings for a couple of seconds and does not see fixtures that
	// were written straight to PocketBase, so wait until anything cached before them has expired
	await new Promise((resolve) => setTimeout(resolve, 2200));
	return w;
}

/** Scores that satisfy every criterion of a category in the given stage. */
export const preliminaryScores = (n = 5) => ({
	implementation: String(Math.min(n, 10)),
	innovation: String(Math.min(n, 5)),
	usefulness: String(Math.min(n, 5))
});
export const finalScores = (n = 5) => ({
	...preliminaryScores(n),
	finalPresentation: String(Math.min(n, 5))
});
