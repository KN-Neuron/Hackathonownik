import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildWorld, type World } from './helpers';

let w: World;
let presentationOf: Record<string, string>;
beforeAll(async () => {
	w = await buildWorld();
	const rows = await w.pb.collection('presentations').getFullList({ fields: 'id,team' });
	presentationOf = Object.fromEntries(
		Object.entries(w.teams).map(([name, team]) => [name, rows.find((r) => r.team === team.id)!.id])
	);
});
afterAll(() => w.cleanup());

type Who = 'anon' | 'alice' | 'carol' | 'juryA1' | 'juryF' | 'juryNone' | 'admin';
const clientFor = async (who: Who) => (who === 'anon' ? w.anon() : w.as(who));

describe('pages: who gets in (303 = sent away)', () => {
	// path, then the expected status per role
	const pages: [string, Partial<Record<Who, number>>][] = [
		['/info', { anon: 200, alice: 200, juryA1: 200, admin: 200 }],
		['/upload', { anon: 303, alice: 200, juryA1: 303, admin: 200 }],
		['/my-submission', { anon: 303, alice: 200, juryA1: 303 }],
		['/rate_presentation', { anon: 303, alice: 303, juryA1: 200, juryNone: 200, admin: 200 }],
		['/presentations', { anon: 303, alice: 303, juryA1: 200, juryNone: 200, admin: 200 }],
		['/ranking', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/present', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/dashboard', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/people', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/ratings', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/audit', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/import', { anon: 303, alice: 303, juryA1: 303, admin: 200 }],
		['/admin/system-info', { anon: 303, alice: 303, juryA1: 303, admin: 200 }]
	];
	for (const [path, expectations] of pages) {
		for (const [who, expected] of Object.entries(expectations) as [Who, number][]) {
			it(`${who} → ${path} is ${expected}`, async () => {
				expect(await (await clientFor(who)).status(path)).toBe(expected);
			});
		}
	}

	it('sends a logged-in user away from /login', async () => {
		expect(await (await w.as('alice')).status('/login')).toBe(303);
	});

	it('lands each role on its own page after login', async () => {
		for (const [who, expected] of [
			['alice', '/my-submission'],
			['juryA1', '/rate_presentation'],
			['admin', '/admin/dashboard']
		] as const) {
			const res = await w.anon().request('/login', {
				method: 'POST',
				body: new URLSearchParams({ email: w.email(who), password: 'E2e-test-password-1' }),
				headers: { 'x-sveltekit-action': 'true' }
			});
			expect((await res.json()).location).toBe(expected);
		}
	});
});

describe('API endpoints', () => {
	const checks: [string, string, Partial<Record<Who, number>>][] = [
		// stage state: jurors of the category and admins
		[
			'GET',
			'/api/stage?category=adaptive',
			{ anon: 403, alice: 403, juryA1: 200, juryF: 403, juryNone: 403, admin: 200 }
		],
		['GET', '/api/stage?category=nope', { juryA1: 403, admin: 403 }],
		// rankings: nobody but admin before anything is published or finished
		[
			'GET',
			'/api/rankings/data?category=adaptive',
			{ anon: 401, alice: 403, carol: 403, juryA1: 403, admin: 200 }
		],
		['GET', '/api/rankings/data?category=nope', { admin: 403 }],
		['GET', '/api/rankings/data', { admin: 403 }],
		['GET', '/api/export/ranking-md?category=adaptive', { alice: 403, juryA1: 403, admin: 200 }],
		// ratings of a team: category is derived from the team, not from the request
		[
			'GET',
			'/api/ratings/team-details?teamId=ALPHA',
			{ anon: 401, alice: 403, juryA1: 403, admin: 200 }
		],
		['GET', '/api/ratings/team-details?teamId=nonexistent', { admin: 403 }],
		[
			'GET',
			'/api/ratings?teamId=ALPHA',
			{ anon: 403, alice: 403, juryA1: 200, juryF: 200, admin: 200 }
		]
	];
	for (const [method, template, expectations] of checks) {
		for (const [who, expected] of Object.entries(expectations) as [Who, number][]) {
			it(`${method} ${template} as ${who} is ${expected}`, async () => {
				const path = template.replace('ALPHA', w.teams.alpha.id);
				expect((await (await clientFor(who)).json(path)).status).toBe(expected);
			});
		}
	}

	it('refuses writes of non-jurors', async () => {
		const alice = await w.as('alice');
		const note = await alice.json('/api/jury/notes', 'PUT', {
			teamId: w.teams.alpha.id,
			content: 'x'
		});
		const confirm = await alice.json('/api/jury/confirm-grading', 'POST', {
			category: 'adaptive',
			confirmed: true
		});
		const stage = await alice.json('/api/stage', 'POST', { category: 'adaptive', action: 'clear' });
		expect([note.status, confirm.status, stage.status]).toEqual([403, 403, 403]);
		expect(
			(await w.anon().json('/api/jury/notes', 'PUT', { teamId: w.teams.alpha.id, content: 'x' }))
				.status
		).toBe(403);
	});

	it("doesn't let a juror control the stage or reach other categories' notes and confirmations", async () => {
		const juryA1 = await w.as('juryA1');
		expect(
			(await juryA1.json('/api/stage', 'POST', { category: 'adaptive', action: 'clear' })).status
		).toBe(403);
		expect(
			(await juryA1.json('/api/jury/notes', 'PUT', { teamId: w.teams.gamma.id, content: 'x' }))
				.status
		).toBe(403);
		expect(
			(
				await juryA1.json('/api/jury/confirm-grading', 'POST', {
					category: 'fnirs',
					confirmed: true
				})
			).status
		).toBe(403);
		expect(
			(await juryA1.json('/api/jury/views', 'POST', { teamId: w.teams.gamma.id, item: 'repo' }))
				.status
		).toBe(403);
	});

	it('only admins can use the unlock endpoint', async () => {
		for (const who of ['anon', 'alice', 'juryA1'] as Who[]) {
			const c = await clientFor(who);
			expect((await c.unlock('anything')).status).toBe(403);
			expect((await c.json('/api/admin/unlock', 'DELETE')).status).toBe(403);
		}
	});
});

describe('presentation files', () => {
	const cases: [Who, 'alpha' | 'beta' | 'gamma', number][] = [
		['anon', 'alpha', 401],
		['alice', 'alpha', 200], // own team
		['alice', 'beta', 404], // other team in the same category
		['alice', 'gamma', 404],
		['carol', 'alpha', 404],
		['juryA1', 'alpha', 200],
		['juryA1', 'beta', 200],
		['juryA1', 'gamma', 404], // other category
		['juryF', 'gamma', 200],
		['juryF', 'alpha', 404],
		['juryNone', 'alpha', 404],
		['admin', 'alpha', 200],
		['admin', 'gamma', 200]
	];
	for (const [who, team, expected] of cases) {
		it(`${who} opens the file of ${team}: ${expected}`, async () => {
			const res = await (
				await clientFor(who)
			).request(`/api/presentations/${presentationOf[team]}`);
			expect(res.status).toBe(expected);
			if (expected === 200) expect(res.headers.get('content-type')).toContain('pdf');
		});
	}

	it("doesn't distinguish missing from forbidden files", async () => {
		const alice = await w.as('alice');
		const forbidden = await alice.request(`/api/presentations/${presentationOf.beta}`);
		const missing = await alice.request('/api/presentations/doesnotexist1234');
		expect(forbidden.status).toBe(missing.status);
	});

	it('serves PDFs framable by our own pages only', async () => {
		const res = await (await w.as('juryA1')).request(`/api/presentations/${presentationOf.alpha}`);
		expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
		expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
		const page = await (await w.as('juryA1')).request('/rate_presentation');
		expect(page.headers.get('x-frame-options')).toBe('DENY');
	});
});
