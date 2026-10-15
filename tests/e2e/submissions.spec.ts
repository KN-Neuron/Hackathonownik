import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildWorld, pdfFile, type World } from './helpers';

let w: World;
beforeAll(async () => {
	w = await buildWorld();
	// The fixture teams come with a submission; these tests start from an empty team
	const rows = await w.pb
		.collection('presentations')
		.getFullList({ filter: `team = "${w.teams.alpha.id}"` });
	await Promise.all(rows.map((r) => w.pb.collection('presentations').delete(r.id)));
});
afterAll(() => w.cleanup());

const upload = async (
	who: 'alice' | 'bob' | 'carol' | 'loner',
	fields: Record<string, string> = {},
	files = {}
) => (await w.as(who)).action('/upload?/upload', fields, files);

const records = (team: string) =>
	w.pb.collection('presentations').getFullList({ filter: `team = "${team}"`, sort: 'created' });

describe('team submissions merge', () => {
	it('starts empty and incomplete', async () => {
		const { page } = await (await w.as('alice')).data('/upload');
		expect(page.submission).toBeNull();
		expect(page.required).toEqual(['presentation', 'repo', 'video']);
	});

	it("one teammate adds a link, another the PDF: the jury's view has both, with authors", async () => {
		const first = await upload('alice', { repo_link: 'github.com/e2e/alpha' });
		expect(first.data.success).toBe(true);
		const second = await upload('bob', {}, { file: pdfFile('Mój plik (1).pdf') });
		expect(second.data.success).toBe(true);
		const third = await upload('alice', { video_link: 'https://youtu.be/dQw4w9WgXcQ' });
		expect(third.data.success).toBe(true);

		const { page } = await (await w.as('bob')).data('/upload');
		expect(page.submission.complete).toBe(true);
		expect(page.submission.repo.url).toBe('https://github.com/e2e/alpha');
		expect(page.submission.repo.submittedBy).toContain('alice');
		expect(page.submission.presentation.submittedBy).toContain('bob');
		expect(page.submission.history).toHaveLength(3);
	});

	it('stores PDFs under a safe name derived from the team, whatever the original was', async () => {
		const [pdfRecord] = (await records(w.teams.alpha.id)).filter((r) => r.presentation);
		expect(pdfRecord.presentation).toMatch(/^e2e_alpha_[a-z0-9]+_\w+\.pdf$/);
	});

	it('a link that did not change is not saved again (author stays)', async () => {
		const before = (await records(w.teams.alpha.id)).length;
		const res = await upload('bob', { repo_link: 'https://github.com/e2e/alpha' });
		expect(res.data.success).toBe(false);
		expect(res.data.message).toMatch(/Nothing new/);
		expect((await records(w.teams.alpha.id)).length).toBe(before);
	});

	it('replacing an item makes the newer version current', async () => {
		await upload('bob', { repo_link: 'https://github.com/e2e/alpha-v2' });
		const { page } = await (await w.as('alice')).data('/upload');
		expect(page.submission.repo.url).toBe('https://github.com/e2e/alpha-v2');
		expect(page.submission.repo.submittedBy).toContain('bob');
	});

	it('a team only ever sees and changes its own submission', async () => {
		const carol = (await (await w.as('carol')).data('/upload')).page;
		expect(carol.submission.repo.url).toBe('https://github.com/e2e/beta');
		expect(carol.teamName).toContain('Beta');
	});

	it('ignores a "team" field in the request: the team comes from the session', async () => {
		const res = await upload('alice', {
			repo_link: 'https://github.com/e2e/hijack',
			team: w.teams.beta.id,
			submitted_by: w.users.carol.id
		});
		expect(res.data.success).toBe(true);
		const beta = await records(w.teams.beta.id);
		expect(beta.some((r) => r.repo_link === 'https://github.com/e2e/hijack')).toBe(false);
		const alpha = await records(w.teams.alpha.id);
		const hijack = alpha.find((r) => r.repo_link === 'https://github.com/e2e/hijack')!;
		expect(hijack.submitted_by).toBe(w.users.alice.id);
	});
});

describe('validation of what participants send', () => {
	it.each([
		['not a PDF', pdfLike('MZ\u0090 not a pdf at all'), /not a PDF/],
		[
			'an empty file with a PDF name',
			new File([''], 'a.pdf', { type: 'application/pdf' }),
			/Nothing new|No file/
		]
	])('rejects %s', async (_name, file, message) => {
		const res = await upload('alice', {}, { file });
		expect(res.data.success).toBe(false);
		expect(res.data.message).toMatch(message);
	});

	it('rejects links that are not web addresses, including script-like ones', async () => {
		for (const bad of [
			'my video',
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'ftp//x',
			'localhost',
			'//',
			'http://'
		]) {
			const res = await upload('carol', { video_link: bad });
			expect(res.data.success, bad).toBe(false);
		}
		const stored = await records(w.teams.beta.id);
		expect(stored.every((r) => !String(r.video_link ?? '').includes('script'))).toBe(true);
	});

	it('adds https:// to bare addresses and keeps the path', async () => {
		const res = await upload('carol', { video_link: 'youtu.be/abc_DEF-123?t=5' });
		expect(res.data.success).toBe(true);
		const { page } = await (await w.as('carol')).data('/upload');
		expect(page.submission.video.url).toBe('https://youtu.be/abc_DEF-123?t=5');
	});

	it('refuses a request without or with a wrong CSRF token', async () => {
		const carol = await w.as('carol');
		for (const token of ['', 'wrong-token']) {
			const res = await carol.action('/upload?/upload', {
				csrf_token: token,
				repo_link: 'https://x.example/y'
			});
			expect(res.data.success).toBe(false);
			expect(res.data.message).toMatch(/security token/);
		}
	});

	it('refuses people without a team', async () => {
		const res = await upload('loner', { repo_link: 'https://x.example/y' });
		expect(res.data.success).toBe(false);
		expect(res.data.message).toMatch(/team/i);
	});

	it('refuses jurors and anonymous visitors', async () => {
		const juror = await (
			await w.as('juryA1')
		).action('/upload?/upload', { repo_link: 'https://x.example/y' });
		expect(juror.data?.success).not.toBe(true);
		const anon = await w.anon().request('/upload?/upload', {
			method: 'POST',
			body: new URLSearchParams({ repo_link: 'https://x.example/y' }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		// SvelteKit answers form requests with a JSON redirect to the login page
		const body = await anon.json();
		expect(body.type).toBe('redirect');
		expect(body.location).toContain('/login');
	});

	it('handles unicode, very long and odd file names', async () => {
		for (const name of [
			'zażółć gęślą jaźń.pdf',
			`${'a'.repeat(300)}.pdf`,
			'../../etc/passwd.pdf',
			'a b\t.pdf'
		]) {
			const res = await upload('carol', {}, { file: pdfFile(name) });
			expect(res.data.success, name).toBe(true);
		}
		const files = (await records(w.teams.beta.id)).map((r) => r.presentation).filter(Boolean);
		expect(files.every((f) => /^[\w.-]+$/.test(f))).toBe(true);
	});
});

describe('final presentation', () => {
	it('is accepted separately and shown as its own item', async () => {
		const res = await upload('bob', {}, { final_file: pdfFile('final.pdf') });
		expect(res.data.success).toBe(true);
		const { page } = await (await w.as('alice')).data('/upload');
		expect(page.submission.final_presentation.fileName).toMatch(/_final_/);
		// the preliminary presentation is untouched
		expect(page.submission.presentation.fileName).not.toMatch(/_final_/);
	});

	it('is checked like any PDF', async () => {
		const res = await upload('bob', {}, { final_file: pdfLike('plain text') });
		expect(res.data.success).toBe(false);
	});

	it('is served to the jury with ?file=final', async () => {
		const { page } = await (await w.as('alice')).data('/upload');
		const res = await (await w.as('juryA1')).request(page.submission.final_presentation.url);
		expect(res.status).toBe(200);
	});
});

function pdfLike(content: string) {
	return new File([content], 'looks-like.pdf', { type: 'application/pdf' });
}
