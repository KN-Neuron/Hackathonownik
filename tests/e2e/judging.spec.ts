import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildWorld, finalScores, preliminaryScores, type World } from './helpers';

let w: World;
beforeAll(async () => {
	w = await buildWorld();
	await (await w.as('admin')).unlock();
});
afterAll(() => w.cleanup());

type Juror = 'juryA1' | 'juryA2' | 'juryBoth';
const jurors: Juror[] = ['juryA1', 'juryA2', 'juryBoth'];

const rate = async (
	who: keyof World['users'],
	team: { id: string },
	scores: Record<string, string>,
	extra: Record<string, string> = {}
) => (await w.as(who)).action('/rate_presentation', { teamId: team.id, ...scores, ...extra });

const confirm = async (who: keyof World['users'], category = 'adaptive', confirmed = true) =>
	(await w.as(who)).json('/api/jury/confirm-grading', 'POST', { category, confirmed });

const adminAction = async (name: string, fields: Record<string, string | string[]>) =>
	(await w.as('admin')).action(`/admin/dashboard?/${name}`, fields);

const ratingsOf = (team: string) =>
	w.pb.collection('ratings').getFullList({ filter: `team = "${team}"` });

const progress = async () =>
	(await (await w.as('admin')).data('/admin/dashboard?category=adaptive')).page.progress;

describe('rating validation', () => {
	it('rejects missing, zero, too high, fractional and non-numeric scores', async () => {
		const bad: Record<string, string>[] = [
			{ implementation: '5', innovation: '3' },
			{ ...preliminaryScores(), implementation: '0' },
			{ ...preliminaryScores(), implementation: '11' },
			{ ...preliminaryScores(), innovation: '6' },
			{ ...preliminaryScores(), innovation: '2.5' },
			{ ...preliminaryScores(), usefulness: 'abc' },
			{ ...preliminaryScores(), usefulness: '-3' },
			{ ...preliminaryScores(), implementation: '' }
		];
		for (const scores of bad) {
			const res = await rate('juryA1', w.teams.alpha, scores);
			expect(res.type, JSON.stringify(scores)).toBe('failure');
		}
		expect(await ratingsOf(w.teams.alpha.id)).toHaveLength(0);
	});

	it('ignores a final-stage score in the preliminary round', async () => {
		const res = await rate('juryA1', w.teams.alpha, {
			...preliminaryScores(),
			finalPresentation: '5'
		});
		expect(res.type).toBe('success');
		const [r] = await ratingsOf(w.teams.alpha.id);
		expect(r.scores.finalPresentation).toBeUndefined();
	});

	it('keeps one record per juror and team when re-rating', async () => {
		await rate('juryA1', w.teams.alpha, preliminaryScores(4), { comments: 'Nice' });
		await rate('juryA1', w.teams.alpha, preliminaryScores(3), { comments: 'Better' });
		const mine = (await ratingsOf(w.teams.alpha.id)).filter((r) => r.jury === w.users.juryA1.id);
		expect(mine).toHaveLength(1);
		expect(mine[0].finalGrade).toBe(3 + 3 + 3);
		expect(mine[0].comments).toBe('Better');
	});
});

describe('who may rate', () => {
	it('refuses jurors of another category, jurors without categories, participants, anonymous', async () => {
		for (const who of ['juryF', 'juryNone', 'alice', 'loner'] as const) {
			const res = await rate(who, w.teams.beta, preliminaryScores());
			expect(res.type, who).not.toBe('success');
		}
		const anon = await w.anon().action('/rate_presentation', {
			teamId: w.teams.beta.id,
			...preliminaryScores()
		});
		expect(anon.type).not.toBe('success');
		expect(await ratingsOf(w.teams.beta.id)).toHaveLength(0);
	});

	it('a juror of two categories rates each with its own criteria', async () => {
		expect((await rate('juryBoth', w.teams.gamma, preliminaryScores())).type).toBe('success');
		expect((await rate('juryBoth', w.teams.alpha, preliminaryScores())).type).toBe('success');
	});

	it('an unknown or missing team is refused', async () => {
		expect((await rate('juryA1', { id: 'nonexistent0000' }, preliminaryScores())).type).toBe(
			'failure'
		);
		expect((await rate('juryA1', { id: '' }, preliminaryScores())).type).toBe('failure');
	});

	it('jurors cannot read ratings of others through the app', async () => {
		const { page } = await (await w.as('juryA2')).data('/rate_presentation?category=adaptive');
		const alpha = page.teams.find((t: any) => t.id === w.teams.alpha.id);
		expect(alpha.scores).toBeNull();
		expect(alpha.isRatedByCurrentJury).toBe(false);
	});
});

describe('confirmation', () => {
	it('is refused until the juror rated every team of the category', async () => {
		const res = await confirm('juryA1');
		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/1 of 2/);
	});

	it('works after rating everything, and any new rating withdraws it', async () => {
		await rate('juryA1', w.teams.beta, preliminaryScores(2));
		expect((await confirm('juryA1')).body.success).toBe(true);
		let me = (await progress()).juries.find((j: any) => j.id === w.users.juryA1.id);
		expect(me.confirmed).toBe(true);

		await rate('juryA1', w.teams.beta, preliminaryScores(2));
		me = (await progress()).juries.find((j: any) => j.id === w.users.juryA1.id);
		expect(me.confirmed).toBe(false);
	});

	it("a juror cannot confirm someone else's or a foreign category", async () => {
		expect((await confirm('juryF', 'adaptive')).status).toBe(403);
		expect((await confirm('alice', 'adaptive')).status).toBe(403);
		expect((await confirm('juryA1', 'nope')).status).toBe(403);
		expect((await w.anon().json('/api/jury/confirm-grading', 'POST', {})).status).toBeGreaterThan(
			399
		);
	});

	it('the admin may confirm for a juror only when that juror rated everything', async () => {
		const early = await adminAction('confirmForJury', {
			category: 'adaptive',
			jury_id: w.users.juryA2.id
		});
		expect(early.data.success).toBe(false);
		const outsider = await adminAction('confirmForJury', {
			category: 'adaptive',
			jury_id: w.users.juryF.id
		});
		expect(outsider.data.success).toBe(false);
	});
});

describe('progress and publishing in the preliminary round', () => {
	it('is not ready until all three jurors rated both teams and confirmed', async () => {
		expect((await progress()).readyToPublish).toBe(false);
		await rate('juryA1', w.teams.alpha, preliminaryScores(4));
		await rate('juryA1', w.teams.beta, preliminaryScores(2));
		await rate('juryA2', w.teams.alpha, preliminaryScores(5));
		await rate('juryA2', w.teams.beta, preliminaryScores(3));
		await rate('juryBoth', w.teams.alpha, preliminaryScores(3));
		await rate('juryBoth', w.teams.beta, preliminaryScores(1));
		expect((await progress()).readyToPublish).toBe(false);
		// The admin confirms for one of them, the other two confirm themselves
		const done = await adminAction('confirmForJury', {
			category: 'adaptive',
			jury_id: w.users.juryA2.id
		});
		expect(done.data.success).toBe(true);
		await confirm('juryA1');
		await confirm('juryBoth');
		expect((await progress()).readyToPublish).toBe(true);
	});

	it('ranks teams by the average of the jurors', async () => {
		const { page } = await (await w.as('admin')).data('/ranking?category=adaptive');
		const alpha = page.rankings.find((r: any) => r.teamId === w.teams.alpha.id);
		const beta = page.rankings.find((r: any) => r.teamId === w.teams.beta.id);
		expect(alpha.finalGrade).toBeCloseTo(12, 2);
		expect(beta.finalGrade).toBeCloseTo(6, 2);
		expect(alpha.rank).toBe(1);
		expect(beta.rank).toBe(2);
	});

	it('a published category is locked: no rating, no confirming, no re-assigning', async () => {
		const published = await adminAction('publishCategory', { category: 'adaptive', force: 'true' });
		expect(published.data.success).toBe(true);
		// The final presentation score does not exist yet, so the preliminary ranking is what's public
		const res = await rate('juryA1', w.teams.alpha, preliminaryScores(1));
		expect(res.type).toBe('failure');
		expect((await confirm('juryA1', 'adaptive', false)).status).toBe(409);
		const move = await adminAction('setJuryCategories', {
			jury_id: w.users.juryA1.id,
			categories: ['adaptive', 'fnirs']
		});
		expect(move.type).toBe('success');
	});

	it('participants see their results only after publishing; others stay hidden', async () => {
		const alice = await w.as('alice');
		const loner = await w.as('loner');
		expect((await alice.data('/ranking?category=adaptive')).page.rankings).toHaveLength(2);
		// gamma's category is not published
		const gina = await w.as('gina');
		expect((await gina.data('/ranking?category=fnirs')).page?.rankings ?? []).not.toHaveLength(1);
		expect((await loner.data('/ranking')).status).toBe(200);
	});

	it('feedback reaches the team without the juror name', async () => {
		const { page } = await (await w.as('alice')).data('/my-submission');
		const text = JSON.stringify(page);
		expect(text).not.toContain(w.users.juryA1.email);
		expect(text).not.toContain(w.users.juryA1.id);
	});

	it('unpublishing hides the results again and unlocks rating', async () => {
		expect((await adminAction('unpublishCategory', { category: 'adaptive' })).data.success).toBe(
			true
		);
		const { page } = await (await w.as('alice')).data('/ranking?category=adaptive');
		expect(page?.rankings ?? []).toHaveLength(0);
		expect((await rate('juryA1', w.teams.alpha, preliminaryScores(4))).type).toBe('success');
	});
});

describe('final round', () => {
	it('only teams of the category that submitted can be finalists', async () => {
		const res = await adminAction('startFinal', {
			category: 'adaptive',
			finalists: [w.teams.gamma.id],
			force: 'true'
		});
		expect(res.data.success).toBe(false);
	});

	it('needs at least one finalist, and a known category', async () => {
		expect(
			(await adminAction('startFinal', { category: 'adaptive', force: 'true' })).data.success
		).toBe(false);
		expect(
			(await adminAction('startFinal', { category: 'zzz', finalists: [w.teams.alpha.id] })).data
				.success
		).toBe(false);
	});

	it('starts with alpha and beta, and everyone confirms again', async () => {
		const res = await adminAction('startFinal', {
			category: 'adaptive',
			finalists: [w.teams.alpha.id, w.teams.beta.id],
			force: 'true'
		});
		expect(res.data.success).toBe(true);
		const p = await progress();
		expect(p.stage).toBe('final');
		expect(p.confirmedCount).toBe(0);
		expect(p.readyToPublish).toBe(false);
	});

	it('the final needs the final presentation score as well', async () => {
		const missing = await rate('juryA1', w.teams.alpha, preliminaryScores());
		expect(missing.type).toBe('failure');
		const ok = await rate('juryA1', w.teams.alpha, finalScores(4));
		expect(ok.type).toBe('success');
	});

	it('equal totals are a tie: publishing needs the jury vote first', async () => {
		for (const who of jurors) {
			for (const team of [w.teams.alpha, w.teams.beta]) {
				expect((await rate(who, team, finalScores(4))).type).toBe('success');
			}
			await confirm(who);
		}
		expect((await progress()).readyToPublish).toBe(true);

		const blocked = await adminAction('publishCategory', { category: 'adaptive' });
		expect(blocked.data.success).toBe(false);
		expect(blocked.data.message).toMatch(/tie/i);
	});

	it('only a tied team can win the vote', async () => {
		const stranger = await adminAction('setTieWinner', {
			category: 'adaptive',
			team_id: w.teams.gamma.id
		});
		expect(stranger.data.success).toBe(false);
		const ok = await adminAction('setTieWinner', {
			category: 'adaptive',
			team_id: w.teams.beta.id
		});
		expect(ok.data.success).toBe(true);
	});

	it('then publishing works and the tie winner is first', async () => {
		const res = await adminAction('publishCategory', { category: 'adaptive' });
		expect(res.data.success).toBe(true);
		const { page } = await (await w.as('carol')).data('/ranking?category=adaptive');
		expect(page.rankings[0].teamId).toBe(w.teams.beta.id);
		expect(page.rankings[0].rank).toBe(1);
		expect(page.rankings[1].rank).toBe(2);
	});

	it('going back to the preliminary round needs the category unpublished first', async () => {
		expect((await adminAction('backToPreliminary', { category: 'adaptive' })).data.success).toBe(
			false
		);
		await adminAction('unpublishCategory', { category: 'adaptive' });
		expect((await adminAction('backToPreliminary', { category: 'adaptive' })).data.success).toBe(
			true
		);
		expect((await progress()).stage).toBe('preliminary');
	});
});

describe('moving a team between categories', () => {
	it('removes its ratings and refuses unknown categories and published ones', async () => {
		expect(
			(await adminAction('setTeamCategory', { team_id: w.teams.beta.id, category: 'zzz' })).data
				.success
		).toBe(false);
		const res = await adminAction('setTeamCategory', {
			team_id: w.teams.beta.id,
			category: 'fnirs'
		});
		expect(res.data.success).toBe(true);
		expect(await ratingsOf(w.teams.beta.id)).toHaveLength(0);
		await adminAction('setTeamCategory', { team_id: w.teams.beta.id, category: 'adaptive' });
	});
});
