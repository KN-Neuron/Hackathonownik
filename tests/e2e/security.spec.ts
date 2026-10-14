import PocketBase from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { APP_URL, AppClient, PASSWORD, PB_URL, buildWorld, pdfFile, type World } from './helpers';

let w: World;
beforeAll(async () => {
	w = await buildWorld();
});
afterAll(() => w.cleanup());

/** A browser talking to PocketBase directly, as an attacker holding a stolen or own login. */
const pbAs = async (name: keyof World['users']) => {
	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);
	await pb.collection('users').authWithPassword(w.email(name), PASSWORD);
	return pb;
};

const fails = async (p: Promise<unknown>) => {
	try {
		await p;
		return false;
	} catch {
		return true;
	}
};

describe('PocketBase API used directly (the rules are the last line of defence)', () => {
	it('a participant cannot promote themselves or change their team', async () => {
		const pb = await pbAs('alice');
		const id = w.users.alice.id;
		expect(await fails(pb.collection('users').update(id, { role: 'admin' }))).toBe(true);
		expect(await fails(pb.collection('users').update(id, { team: w.teams.gamma.id }))).toBe(true);
		expect(await fails(pb.collection('users').update(id, { jury_categories: ['adaptive'] }))).toBe(
			true
		);
		const me = await w.pb.collection('users').getOne(id);
		expect(me.role).toBe('participant');
		expect(me.team).toBe(w.teams.alpha.id);
	});

	it('nobody can register themselves as an admin or a juror', async () => {
		const pb = new PocketBase(PB_URL);
		for (const role of ['admin', 'jury', 'participant']) {
			const email = `self-${role}-${w.tag}@example.test`;
			const failed = await fails(
				pb.collection('users').create({
					email,
					password: PASSWORD,
					passwordConfirm: PASSWORD,
					role,
					name: 'Self'
				})
			);
			expect(failed, role).toBe(true);
		}
	});

	it('participants cannot read other users, ratings, notes, views, state or audit log', async () => {
		const pb = await pbAs('alice');
		const others = await pb.collection('users').getFullList();
		expect(others.every((u) => u.id === w.users.alice.id)).toBe(true);
		for (const collection of [
			'ratings',
			'jury_notes',
			'jury_views',
			'event_state',
			'admin_audit'
		]) {
			const rows = await pb
				.collection(collection)
				.getFullList()
				.catch(() => []);
			expect(rows, collection).toHaveLength(0);
		}
	});

	it('participants cannot rate, and cannot create or delete teams or submissions of others', async () => {
		const pb = await pbAs('alice');
		expect(
			await fails(
				pb.collection('ratings').create({
					jury: w.users.alice.id,
					team: w.teams.beta.id,
					scores: { implementation: 10 },
					finalGrade: 10
				})
			)
		).toBe(true);
		expect(await fails(pb.collection('teams').delete(w.teams.beta.id))).toBe(true);
		expect(
			await fails(pb.collection('teams').update(w.teams.alpha.id, { category: 'fnirs' }))
		).toBe(true);
		const [row] = await w.pb.collection('presentations').getFullList({
			filter: `team = "${w.teams.beta.id}"`
		});
		expect(await fails(pb.collection('presentations').delete(row.id))).toBe(true);
		expect(
			await fails(pb.collection('presentations').update(row.id, { repo_link: 'https://x.y' }))
		).toBe(true);
	});

	it('a juror sees only their own ratings, cannot edit others, cannot write someone else as the juror', async () => {
		const own = await w.as('juryA1');
		await own.action('/rate_presentation', {
			teamId: w.teams.alpha.id,
			implementation: '5',
			innovation: '5',
			usefulness: '5'
		});
		const other = await w.as('juryA2');
		await other.action('/rate_presentation', {
			teamId: w.teams.alpha.id,
			implementation: '1',
			innovation: '1',
			usefulness: '1'
		});

		const pb = await pbAs('juryA1');
		const visible = await pb.collection('ratings').getFullList();
		expect(visible.every((r) => r.jury === w.users.juryA1.id)).toBe(true);

		const theirs = await w.pb
			.collection('ratings')
			.getFullList({ filter: `jury = "${w.users.juryA2.id}"` });
		expect(theirs.length).toBeGreaterThan(0);
		expect(await fails(pb.collection('ratings').update(theirs[0].id, { scores: { x: 10 } }))).toBe(
			true
		);
		expect(await fails(pb.collection('ratings').delete(theirs[0].id))).toBe(true);
		expect(
			await fails(
				pb.collection('ratings').create({
					jury: w.users.juryA2.id,
					team: w.teams.beta.id,
					scores: { implementation: 10, innovation: 5, usefulness: 5 },
					finalGrade: 20
				})
			)
		).toBe(true);
	});

	it('cannot list users filtered by role or fetch the superuser collection', async () => {
		const pb = await pbAs('juryA1');
		expect(await fails(pb.collection('_superusers').getFullList())).toBe(true);
		const users = await pb.collection('users').getFullList({ filter: 'role = "admin"' });
		expect(users).toHaveLength(0);
	});

	it('uploaded files are not readable without a token', async () => {
		const [row] = await w.pb.collection('presentations').getFullList({
			filter: `team = "${w.teams.alpha.id}"`
		});
		const url = `${PB_URL}/api/files/presentations/${row.id}/${row.presentation}`;
		const res = await fetch(url);
		expect(res.status).toBeGreaterThanOrEqual(400);
		const viaApp = await w.anon().request(`/api/presentations/${row.id}`);
		expect([401, 303]).toContain(viaApp.status);
	});
});

describe('injection', () => {
	const payloads = [
		`" || 1=1 || "`,
		`' OR '1'='1`,
		`adaptive" || category != "`,
		`x"; DROP TABLE users; --`,
		`{:x}`,
		`../../etc/passwd`,
		'%00',
		'<script>alert(1)</script>'
	];

	it('query parameters never widen what an endpoint returns', async () => {
		const jury = await w.as('juryA1');
		for (const p of payloads) {
			const q = encodeURIComponent(p);
			const { page } = await jury.data(`/rate_presentation?category=${q}`);
			// Unknown category falls back to the juror's own, never to everything
			expect(
				page.teams.every((t: any) => t.category === 'adaptive'),
				p
			).toBe(true);
			const res = await jury.request(`/api/ratings?teamId=${q}`);
			expect([200, 400, 403, 404], p).toContain(res.status);
			if (res.status === 200) {
				const body = await res.json();
				expect(JSON.stringify(body), p).not.toContain(w.users.juryA2.id);
			}
			expect(
				(await jury.request(`/api/ratings/team-details?teamId=${q}`)).status,
				p
			).toBeGreaterThanOrEqual(400);
			expect((await jury.request(`/api/presentations/${q}`)).status, p).toBeGreaterThanOrEqual(400);
		}
	});

	it('form fields with filter syntax are treated as plain values', async () => {
		const jury = await w.as('juryA1');
		for (const p of payloads) {
			const res = await jury.action('/rate_presentation', {
				teamId: p,
				implementation: '5',
				innovation: '5',
				usefulness: '5'
			});
			expect(res.type, p).not.toBe('success');
		}
		const res = await jury.json('/api/jury/notes', 'PUT', {
			teamId: w.teams.alpha.id,
			content: payloads.join('\n')
		});
		expect(res.status).toBe(200);
		const [note] = await w.pb.collection('jury_notes').getFullList({
			filter: `jury = "${w.users.juryA1.id}"`
		});
		expect(note.content).toContain('DROP TABLE');
	});

	it('login with injection strings fails cleanly', async () => {
		for (const email of payloads) {
			const res = await w.anon().request('/login', {
				method: 'POST',
				body: new URLSearchParams({ email, password: `${email}` }),
				headers: { 'x-sveltekit-action': 'true' }
			});
			expect(res.status, email).toBeLessThan(500);
			const body = await res.json().catch(() => ({}));
			expect(body.type, email).not.toBe('redirect');
		}
	});
});

describe('stored XSS', () => {
	const xss = `<img src=x onerror=alert(1)><script>alert(2)</script>`;

	it('team names, links and feedback come back as data and never as markup', async () => {
		await w.pb.collection('teams').update(w.teams.alpha.id, { name: `E2E ${xss}` });
		const jury = await w.as('juryA1');
		await jury.action('/rate_presentation', {
			teamId: w.teams.alpha.id,
			implementation: '5',
			innovation: '5',
			usefulness: '5',
			comments: xss
		});
		for (const path of ['/rate_presentation?category=adaptive', '/presentations', '/present']) {
			const res = await jury.request(path);
			const html = await res.text();
			expect(html, path).not.toContain('<script>alert(2)</script>');
			expect(html, path).not.toContain('<img src=x onerror');
		}
		const admin = await w.as('admin');
		for (const path of ['/admin/dashboard', '/admin/people', '/admin/ratings', '/admin/audit']) {
			const html = await (await admin.request(path)).text();
			expect(html, path).not.toContain('<script>alert(2)</script>');
			expect(html, path).not.toContain('<img src=x onerror');
		}
		await w.pb.collection('teams').update(w.teams.alpha.id, { name: `E2E Alpha ${w.tag}` });
	});

	it('dangerous link schemes are not accepted as repository or video links', async () => {
		const alice = await w.as('alice');
		for (const link of [
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'vbscript:x',
			'file:///etc/passwd',
			'ftp://example.com/x'
		]) {
			const res = await alice.action('/upload?/upload', { repo_link: link });
			expect(res.data?.success, link).not.toBe(true);
			const res2 = await alice.action('/upload?/upload', { video_link: link });
			expect(res2.data?.success, link).not.toBe(true);
		}
		const rows = await w.pb.collection('presentations').getFullList({
			filter: `team = "${w.teams.alpha.id}"`
		});
		expect(JSON.stringify(rows)).not.toMatch(/javascript:|data:text|vbscript:|file:\/\//);
	});
});

describe('uploads', () => {
	it('refuses files that are not PDFs, even with a PDF name or type', async () => {
		const alice = await w.as('alice');
		const fakes = [
			new File(['<?php echo 1; ?>'], 'shell.pdf', { type: 'application/pdf' }),
			new File(['<script>alert(1)</script>'], 'a.html', { type: 'text/html' }),
			new File(['MZ\x90\x00'], 'x.exe', { type: 'application/x-msdownload' }),
			new File([''], 'empty.pdf', { type: 'application/pdf' })
		];
		for (const file of fakes) {
			const res = await alice.action('/upload?/upload', {}, { file });
			expect(res.data?.success, file.name).not.toBe(true);
		}
	});

	it('refuses oversized files', async () => {
		const alice = await w.as('alice');
		const big = new File(['%PDF-1.4\n' + 'A'.repeat(60 * 1024 * 1024)], 'big.pdf', {
			type: 'application/pdf'
		});
		const res = await alice.action('/upload?/upload', {}, { file: big });
		expect(res.data?.success).not.toBe(true);
	});

	it('refuses very long text instead of storing it', async () => {
		const alice = await w.as('alice');
		const res = await alice.action('/upload?/upload', {
			repo_link: 'https://github.com/' + 'a'.repeat(100_000)
		});
		expect(res.data?.success).not.toBe(true);
		const jury = await w.as('juryA1');
		const rating = await jury.action('/rate_presentation', {
			teamId: w.teams.beta.id,
			implementation: '5',
			innovation: '5',
			usefulness: '5',
			comments: 'x'.repeat(2_000_000)
		});
		// Refused by the body size limit or by the app, never stored
		expect(rating.type).not.toBe('success');
		const mid = await jury.action('/rate_presentation', {
			teamId: w.teams.beta.id,
			implementation: '5',
			innovation: '5',
			usefulness: '5',
			comments: 'y'.repeat(20_000)
		});
		expect(mid.type).toBe('failure');
		const stored = await w.pb.collection('ratings').getFullList({ fields: 'comments' });
		expect(stored.every((r) => (r.comments ?? '').length <= 5000)).toBe(true);
	});

	it('a participant cannot upload on behalf of another team by sending its id', async () => {
		const carol = await w.as('carol');
		const before = await w.pb.collection('presentations').getFullList({
			filter: `team = "${w.teams.alpha.id}"`
		});
		const res = await carol.action('/upload?/upload', {
			team: w.teams.alpha.id,
			teamId: w.teams.alpha.id,
			team_id: w.teams.alpha.id,
			repo_link: 'https://github.com/e2e/hijack'
		});
		const after = await w.pb.collection('presentations').getFullList({
			filter: `team = "${w.teams.alpha.id}"`
		});
		expect(after).toHaveLength(before.length);
		expect(JSON.stringify(after)).not.toContain('hijack');
		void res;
	});

	it('a participant without a team cannot submit', async () => {
		const loner = await w.as('loner');
		const res = await loner.action(
			'/upload?/upload',
			{ repo_link: 'https://github.com/e2e/x' },
			{ file: pdfFile() }
		);
		expect(res.data?.success).not.toBe(true);
	});
});

describe('sessions and CSRF', () => {
	it('forms without the CSRF token are refused, also with another valid token', async () => {
		const alice = await w.as('alice');
		const bobToken = await (await w.as('carol')).csrf();
		for (const token of ['', 'x', bobToken]) {
			const res = await alice.action('/upload?/upload', {
				repo_link: 'https://github.com/e2e/csrf',
				csrf_token: token
			});
			expect(res.data?.success, token).not.toBe(true);
		}
	});

	it('cross-origin form posts are refused by SvelteKit', async () => {
		const alice = await w.as('alice');
		const res = await alice.request('/upload?/upload', {
			method: 'POST',
			origin: 'https://evil.example',
			body: new URLSearchParams({ repo_link: 'https://github.com/e2e/evil' }),
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
		});
		expect(res.status).toBe(403);
	});

	it('JSON endpoints that change data reject other origins', async () => {
		const jury = await w.as('juryA1');
		const res = await jury.request('/api/jury/notes', {
			method: 'PUT',
			origin: 'https://evil.example',
			body: JSON.stringify({ teamId: w.teams.alpha.id, content: 'pwned' }),
			headers: { 'content-type': 'application/json' }
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
		const notes = await w.pb.collection('jury_notes').getFullList();
		expect(JSON.stringify(notes)).not.toContain('pwned');
	});

	it('session cookies are httpOnly and same-site', async () => {
		const c = new AppClient();
		const res = await c.request('/login', {
			method: 'POST',
			body: new URLSearchParams({ email: w.email('alice'), password: PASSWORD }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		const cookies = res.headers.getSetCookie();
		expect(cookies.length).toBeGreaterThan(0);
		for (const cookie of cookies) {
			expect(cookie, cookie.slice(0, 30)).toMatch(/HttpOnly/i);
			expect(cookie, cookie.slice(0, 30)).toMatch(/SameSite=(Strict|Lax)/i);
		}
	});

	it('every role can log out, and the session is gone afterwards', async () => {
		for (const who of ['alice', 'juryA1', 'admin'] as const) {
			const c = await new AppClient().login(w.email(who));
			const res = await c.request('/logout');
			expect(res.status, who).toBe(303);
			expect(res.headers.get('location'), who).toBe('/login');
			// The session cookie is gone: nothing opens any more
			expect((await c.data('/my-submission')).status, who).not.toBe(200);
		}
	});

	it('a forged or tampered session cookie is not accepted', async () => {
		const c = await new AppClient().login(w.email('alice'));
		const tampered = [...c.cookies].map(([k, v]) => `${k}=${v.slice(0, -4)}AAAA`).join('; ');
		const res = await fetch(APP_URL + '/admin/dashboard/__data.json', {
			headers: { cookie: tampered },
			redirect: 'manual'
		});
		expect(res.status === 200 ? (await res.json()).type : 'redirect').not.toBe('data');
	});

	it('wrong passwords never reveal whether an account exists', async () => {
		const a = await w.anon().request('/login', {
			method: 'POST',
			body: new URLSearchParams({ email: w.email('alice'), password: 'wrong-wrong' }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		const b = await w.anon().request('/login', {
			method: 'POST',
			body: new URLSearchParams({ email: `nobody-${w.tag}@example.test`, password: 'wrong-wrong' }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		expect(a.status).toBe(b.status);
		expect(await a.text()).toBe(await b.text());
	});
});

describe('information leaks', () => {
	it('no page or load data of a participant mentions secrets, other teams or jurors', async () => {
		const alice = await w.as('alice');
		const dump = JSON.stringify([
			await alice.data('/'),
			await alice.data('/my-submission'),
			await alice.data('/upload'),
			await alice.data('/info')
		]);
		for (const secret of [
			process.env.POCKETBASE_ADMIN_PASSWORD,
			process.env.ADMIN_ACTION_PASSWORD,
			process.env.COOKIE_ENCRYPTION_KEY,
			w.users.juryA1.email,
			w.users.admin.email,
			w.teams.beta.name
		]) {
			if (secret) expect(dump, String(secret)).not.toContain(String(secret));
		}
	});

	it('error pages do not show stack traces or server paths', async () => {
		for (const path of [
			'/nope',
			'/api/nope',
			'/admin/dashboard/../../etc/passwd',
			'/%00',
			'/%zz'
		]) {
			const res = await w.anon().request(path);
			const text = await res.text();
			expect(text, path).not.toMatch(/node_modules|\/Users\/|at .*\(.*:\d+:\d+\)/);
		}
	});

	it('security headers are set', async () => {
		const res = await w.anon().request('/login');
		expect(res.headers.get('content-security-policy')).toBeTruthy();
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(
			res.headers.get('x-frame-options') || res.headers.get('content-security-policy')
		).toMatch(/DENY|SAMEORIGIN|frame-ancestors/i);
	});
});
