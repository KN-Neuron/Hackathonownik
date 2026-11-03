import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACTION_PASSWORD, AppClient, APP_URL, buildWorld, type World } from './helpers';

let w: World;
beforeAll(async () => {
	w = await buildWorld();
	expect(ACTION_PASSWORD, 'ADMIN_ACTION_PASSWORD must be set for these tests').not.toBe('');
});
afterAll(() => w.cleanup());

const freshAdmin = (name: 'admin' | 'admin2' = 'admin') => new AppClient().login(w.email(name));

const state = async () => (await w.pb.collection('event_state').getFullList())[0] ?? null;
const auditRows = (action: string) =>
	w.pb.collection('admin_audit').getFullList({
		filter: `action = "${action}" && admin_email ~ "e2e-${w.tag}"`
	});

const csv = 'team,category,name,email\nZeta,adaptive,Zed One,zed-one@example.test\n';

const sensitive: [string, string, () => Record<string, string | string[]>][] = [
	['/admin/dashboard', 'publishCategory', () => ({ category: 'adaptive', force: 'true' })],
	['/admin/dashboard', 'unpublishCategory', () => ({ category: 'adaptive' })],
	[
		'/admin/dashboard',
		'startFinal',
		() => ({ category: 'adaptive', finalists: [w.teams.alpha.id], force: 'true' })
	],
	['/admin/dashboard', 'backToPreliminary', () => ({ category: 'adaptive' })],
	[
		'/admin/dashboard',
		'setOrder',
		() => ({ category: 'adaptive', order: [w.teams.beta.id, w.teams.alpha.id] })
	],
	['/admin/dashboard', 'setTieWinner', () => ({ category: 'adaptive', team_id: w.teams.alpha.id })],
	[
		'/admin/dashboard',
		'confirmForJury',
		() => ({ category: 'adaptive', jury_id: w.users.juryA1.id })
	],
	[
		'/admin/dashboard',
		'setJuryCategories',
		() => ({ jury_id: w.users.juryA1.id, categories: ['adaptive', 'fnirs'] })
	],
	[
		'/admin/dashboard',
		'addJury',
		() => ({ name: 'Intruder', email: `intruder-${w.tag}@example.test`, categories: ['adaptive'] })
	],
	['/admin/dashboard', 'resetJuryPassword', () => ({ jury_id: w.users.juryA1.id })],
	['/admin/dashboard', 'setTeamCategory', () => ({ team_id: w.teams.alpha.id, category: 'fnirs' })],
	['/admin/import', 'apply', () => ({ csv })]
];

describe('every sensitive action needs the second password', () => {
	it('is all locked for a freshly logged-in admin', async () => {
		const admin = await freshAdmin();
		const before = await state();
		for (const [page, name, fields] of sensitive) {
			const res = await admin.action(`${page}?/${name}`, fields());
			expect(res.type, name).toBe('failure');
			expect(res.data.needsUnlock, name).toBe(true);
		}
		// Nothing happened
		expect(await state()).toEqual(before);
		const team = await w.pb.collection('teams').getOne(w.teams.alpha.id);
		expect(team.category).toBe('adaptive');
		const users = await w.pb.collection('users').getFullList({ filter: 'email ~ "intruder-"' });
		expect(users).toHaveLength(0);
		const zeta = await w.pb.collection('teams').getFullList({ filter: 'name = "Zeta"' });
		expect(zeta).toHaveLength(0);
	});

	it('writes every refusal to the audit log', async () => {
		for (const [, name] of sensitive) {
			const apply = name === 'apply' ? 'importParticipants' : name;
			const rows = await auditRows(`denied:${apply}`);
			expect(rows.length, apply).toBeGreaterThan(0);
			expect(rows[0].ok).toBe(false);
		}
	});

	it('also refuses a logged-in admin without the CSRF token', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		const res = await admin.action('/admin/dashboard?/unpublishCategory', {
			category: 'adaptive',
			csrf_token: 'wrong'
		});
		expect(res.type).toBe('failure');
		expect(res.data.needsUnlock).toBeUndefined();
	});

	it('participants, jurors and anonymous visitors cannot use the actions, unlocked or not', async () => {
		for (const who of ['alice', 'juryA1', 'juryBoth'] as const) {
			const c = await w.as(who);
			for (const [page, name, fields] of sensitive) {
				const res = await c.action(`${page}?/${name}`, fields());
				expect(res.type, `${who} ${name}`).not.toBe('success');
			}
		}
		const anon = new AppClient();
		for (const [page, name, fields] of sensitive) {
			const res = await anon.action(`${page}?/${name}`, { ...fields(), csrf_token: 'x' });
			expect(res.type, `anon ${name}`).not.toBe('success');
		}
		expect(
			await w.pb.collection('users').getFullList({ filter: 'email ~ "intruder-"' })
		).toHaveLength(0);
	});
});

describe('unlocking', () => {
	it('a wrong password does not unlock, the right one does', async () => {
		const admin = await freshAdmin();
		expect((await admin.unlock('nope')).status).toBe(403);
		const res = await admin.action('/admin/dashboard?/unpublishCategory', { category: 'adaptive' });
		expect(res.data.needsUnlock).toBe(true);

		const ok = await admin.unlock();
		expect(ok.status).toBe(200);
		const after = await admin.action('/admin/dashboard?/unpublishCategory', {
			category: 'adaptive'
		});
		expect(after.data.success).toBe(true);
	});

	it('the cookie cannot be read by scripts and is strictly same-site', async () => {
		const admin = await freshAdmin();
		const res = await admin.request('/api/admin/unlock', {
			method: 'POST',
			body: JSON.stringify({ password: ACTION_PASSWORD }),
			headers: { 'content-type': 'application/json' }
		});
		const cookie = res.headers.getSetCookie().find((c) => c.startsWith('admin_unlock='))!;
		expect(cookie).toMatch(/HttpOnly/i);
		expect(cookie).toMatch(/SameSite=Strict/i);
		expect(cookie).toMatch(/Max-Age=900/i);
	});

	it('locking again takes effect immediately', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		expect(
			(await admin.action('/admin/dashboard?/unpublishCategory', { category: 'adaptive' })).data
				.success
		).toBe(true);
		expect((await admin.json('/api/admin/unlock', 'DELETE')).status).toBe(200);
		const res = await admin.action('/admin/dashboard?/unpublishCategory', {
			category: 'adaptive'
		});
		expect(res.data.needsUnlock).toBe(true);
	});

	it('the dashboard tells the page whether it is unlocked', async () => {
		const admin = await freshAdmin();
		expect((await admin.data('/admin/dashboard')).page.unlock.unlockedUntil).toBeNull();
		await admin.unlock();
		const { page } = await admin.data('/admin/dashboard');
		expect(page.unlock.configured).toBe(true);
		expect(page.unlock.unlockedUntil).toBeGreaterThan(Date.now());
		expect(page.unlock.unlockedUntil).toBeLessThanOrEqual(Date.now() + 15 * 60_000 + 1000);
	});

	it('a few wrong attempts do not lock the account and a right one resets the counter', async () => {
		const admin = await freshAdmin('admin2');
		for (let i = 0; i < 3; i++) expect((await admin.unlock(`wrong-${i}`)).status).toBe(403);
		expect((await admin.unlock()).status).toBe(200);
		for (let i = 0; i < 3; i++) expect((await admin.unlock(`wrong-${i}`)).status).toBe(403);
		expect((await admin.unlock()).status).toBe(200);
	});
});

describe('stolen or forged cookies', () => {
	const cookieOf = (c: AppClient) => c.cookies.get('admin_unlock')!;

	it("an admin's unlock cookie does not work for another admin", async () => {
		const first = await freshAdmin('admin');
		await first.unlock();
		const second = await freshAdmin('admin2');
		second.cookies.set('admin_unlock', cookieOf(first));
		const res = await second.action('/admin/dashboard?/unpublishCategory', {
			category: 'adaptive'
		});
		expect(res.data.needsUnlock).toBe(true);
	});

	it('a made-up or edited cookie is worthless', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		const [id, , mac] = cookieOf(admin).split('.');
		const forged = [
			`${id}.${Date.now() + 3_600_000}.${mac}`, // extended expiry, old signature
			`${id}.${Date.now() + 3_600_000}.${'0'.repeat(mac.length)}`,
			`${w.users.admin2.id}.${Date.now() + 3_600_000}.${mac}`,
			'garbage',
			'',
			'..'
		];
		for (const value of forged) {
			const c = await freshAdmin();
			c.cookies.set('admin_unlock', value);
			const res = await c.action('/admin/dashboard?/unpublishCategory', { category: 'adaptive' });
			expect(res.data?.needsUnlock, value).toBe(true);
		}
	});

	it('a session that is not an admin cannot use an admin cookie', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		const jury = await new AppClient().login(w.email('juryA1'));
		jury.cookies.set('admin_unlock', cookieOf(admin));
		expect((await jury.unlock()).status).toBe(403);
		const res = await jury.action('/admin/dashboard?/unpublishCategory', { category: 'adaptive' });
		expect(res.type).not.toBe('success');
	});
});

describe('the unlock endpoint', () => {
	it('refuses other origins and missing Origin headers', async () => {
		const admin = await freshAdmin();
		const body = JSON.stringify({ password: ACTION_PASSWORD });
		for (const origin of ['https://evil.example', 'null', APP_URL + '.evil.example', null]) {
			const res = await admin.request('/api/admin/unlock', {
				method: 'POST',
				body,
				origin,
				headers: { 'content-type': 'application/json' }
			});
			expect(res.status, String(origin)).toBe(403);
		}
		expect(admin.cookies.has('admin_unlock')).toBe(false);
	});

	it('does not accept the password in the URL or a non-string value', async () => {
		// Stays below the lockout limit (5 in a row); a correct password resets the counter
		const admin = await freshAdmin();
		expect(
			(await admin.json(`/api/admin/unlock?password=${ACTION_PASSWORD}`, 'POST', {})).status
		).toBe(403);
		for (const password of [123, null, { $ne: '' }]) {
			expect((await admin.json('/api/admin/unlock', 'POST', { password })).status).toBe(403);
		}
		expect((await admin.unlock()).status).toBe(200);
		const junk = await admin.request('/api/admin/unlock', { method: 'POST', body: 'not json' });
		expect(junk.status).toBe(403);
		expect((await admin.unlock()).status).toBe(200);
	});

	it('GET is not allowed and the password never appears in a response', async () => {
		const admin = await freshAdmin();
		const res = await admin.request('/api/admin/unlock');
		expect(res.status).toBe(405);
		const ok = await admin.json('/api/admin/unlock', 'POST', { password: ACTION_PASSWORD });
		expect(JSON.stringify(ok.body)).not.toContain(ACTION_PASSWORD);
	});
});

describe('audit log', () => {
	it('records unlocks, locks and wrong passwords with the admin and details', async () => {
		for (const action of ['unlock', 'lock', 'unlock:wrong-password']) {
			const rows = await auditRows(action);
			expect(rows.length, action).toBeGreaterThan(0);
		}
		const [wrong] = await auditRows('unlock:wrong-password');
		expect(wrong.ok).toBe(false);
	});

	it('records successful sensitive actions with their parameters', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		await admin.action('/admin/dashboard?/setOrder', {
			category: 'adaptive',
			order: [w.teams.beta.id, w.teams.alpha.id]
		});
		const rows = await auditRows('setOrder');
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.at(-1)!.ok).toBe(true);
		expect(rows.at(-1)!.details).toMatchObject({ category: 'adaptive', teams: 2 });
	});

	it('never stores passwords in the log', async () => {
		const admin = await freshAdmin();
		await admin.unlock();
		const res = await admin.action('/admin/dashboard?/addJury', {
			name: 'Logged Juror',
			email: `logged-${w.tag}@example.test`,
			categories: ['adaptive']
		});
		expect(res.data.success).toBe(true);
		const password = res.data.credentials?.password ?? res.data.password;
		const all = JSON.stringify(
			await w.pb.collection('admin_audit').getFullList({ filter: `admin_email ~ "e2e-${w.tag}"` })
		);
		expect(all).not.toContain(ACTION_PASSWORD);
		if (password) expect(all).not.toContain(password);
		const created = await w.pb
			.collection('users')
			.getFullList({ filter: `email = "logged-${w.tag}@example.test"` });
		created.forEach((u) =>
			w.pb
				.collection('users')
				.delete(u.id)
				.catch(() => {})
		);
	});

	it('only admins can read the log page', async () => {
		expect((await (await w.as('juryA1')).data('/admin/audit')).status).not.toBe(200);
		expect((await (await w.as('alice')).data('/admin/audit')).status).not.toBe(200);
		expect((await new AppClient().data('/admin/audit')).status).not.toBe(200);
		const { page } = await (await w.as('admin')).data('/admin/audit');
		expect(Array.isArray(page.entries)).toBe(true);
	});
});
