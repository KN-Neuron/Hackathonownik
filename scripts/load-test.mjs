#!/usr/bin/env node
/**
 * Simulates the event day against a running app: everybody logs in at once, participants open
 * their pages and submit at the deadline, jurors rate their categories while the admin watches
 * the dashboard, results are published and everyone opens the ranking at the same moment.
 *
 * Needs a PocketBase filled by scripts/seed-demo.mjs (run it on a throw-away database, the test
 * changes ratings and publishes results) and the app running against it, ideally as a
 * production build (`npm run build`, then `node build`).
 *
 *   APP_URL=http://localhost:4175 DEMO_PASSWORD=... ADMIN_ACTION_PASSWORD=... \
 *   POCKETBASE_URL=... POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
 *   node scripts/load-test.mjs
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { unflatten } from 'devalue';
import PocketBase from 'pocketbase';

// Several app processes: APP_URL=http://localhost:4175,http://localhost:4176 (clients are spread over them).
// With ADDRESS_HEADER=X-Forwarded-For on the app, every simulated person also gets an address of their own.
const APP_URLS = (process.env.APP_URL || 'http://localhost:4175').split(',');
const APP_URL = APP_URLS[0];
let clientCount = 0;
const PASSWORD = process.env.DEMO_PASSWORD;
const ACTION_PASSWORD = process.env.ADMIN_ACTION_PASSWORD;
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
if (!PASSWORD || !ACTION_PASSWORD) {
	console.error('Set DEMO_PASSWORD and ADMIN_ACTION_PASSWORD.');
	process.exit(1);
}

const stats = new Map();
const record = (name, ms, status) => {
	const s = stats.get(name) ?? { times: [], statuses: new Map() };
	s.times.push(ms);
	s.statuses.set(status, (s.statuses.get(status) ?? 0) + 1);
	stats.set(name, s);
};

class Client {
	cookies = new Map();
	base = APP_URLS[clientCount % APP_URLS.length];
	ip = `10.${Math.floor(clientCount / 65_536) % 256}.${Math.floor(clientCount / 256) % 256}.${clientCount++ % 256 || 1}`;
	async request(name, path, init = {}) {
		const started = performance.now();
		let status = 'network-error';
		try {
			const res = await fetch(this.base + path, {
				redirect: 'manual',
				...init,
				headers: {
					cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
					origin: this.base,
					'x-forwarded-for': this.ip,
					...init.headers
				}
			});
			status = res.status;
			for (const c of res.headers.getSetCookie?.() ?? []) {
				const [pair] = c.split(';');
				const i = pair.indexOf('=');
				const value = pair.slice(i + 1);
				if (value === '' || /max-age=0/i.test(c)) this.cookies.delete(pair.slice(0, i));
				else this.cookies.set(pair.slice(0, i), value);
			}
			// Read the body, like a browser would
			const body = await res.arrayBuffer();
			return { res, body };
		} finally {
			record(name, performance.now() - started, status);
		}
	}
	async data(name, path) {
		const [p, q] = path.split('?');
		const { res, body } = await this.request(
			name,
			`${p.replace(/\/$/, '')}/__data.json${q ? `?${q}` : ''}`
		);
		if (res.status !== 200) return null;
		const json = JSON.parse(Buffer.from(body).toString());
		if (!json.nodes) return null;
		const node = (i) => (json.nodes[i]?.type === 'data' ? unflatten(json.nodes[i].data) : null);
		return { layout: node(0), page: node(1) };
	}
	async login(email) {
		const { body } = await this.request('login', '/login', {
			method: 'POST',
			body: new URLSearchParams({ email, password: PASSWORD }),
			headers: { 'x-sveltekit-action': 'true' }
		});
		if (JSON.parse(Buffer.from(body).toString()).type !== 'redirect')
			throw new Error(`login ${email}`);
	}
	async action(name, path, fields = {}, files = {}) {
		const csrf = (await this.data('csrf', '/'))?.layout?.csrfToken;
		const form = new FormData();
		form.append('csrf_token', csrf);
		for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) form.append(k, x);
		for (const [k, f] of Object.entries(files)) form.append(k, f);
		const { body } = await this.request(name, path, {
			method: 'POST',
			body: form,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const json = JSON.parse(Buffer.from(body).toString());
		return { type: json.type, data: json.data ? unflatten(JSON.parse(json.data)) : null };
	}
	json(name, path, method, body) {
		return this.request(name, path, {
			method,
			body: JSON.stringify(body),
			headers: { 'content-type': 'application/json' }
		});
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (max) => sleep(Math.random() * max);
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const rss = () => {
	try {
		const pid = execSync(`lsof -ti tcp:${new URL(APP_URL).port} -sTCP:LISTEN`)
			.toString()
			.trim()
			.split('\n')[0];
		return Math.round(Number(execSync(`ps -o rss= -p ${pid}`).toString()) / 1024);
	} catch {
		return null;
	}
};

const pb = new PocketBase(PB_URL);
await pb
	.collection('_superusers')
	.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD);
const users = await pb
	.collection('users')
	.getFullList({ fields: 'id,email,role,team,jury_categories' });
const participants = users.filter((u) => u.role === 'participant' && u.team);
const jurors = users.filter((u) => u.role === 'jury');
const admin = users.find((u) => u.role === 'admin');
const teams = await pb.collection('teams').getFullList({ fields: 'id,name,category' });
console.log(
	`${participants.length} participants, ${jurors.length} jurors, ${teams.length} teams. App memory at start: ${rss()} MB`
);

const phase = async (title, fn) => {
	const started = performance.now();
	await fn();
	console.log(
		`  ${title}: ${((performance.now() - started) / 1000).toFixed(1)} s (memory ${rss()} MB)`
	);
};

const pdf = () =>
	new File(
		[
			'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n' +
				'%' +
				'x'.repeat(500_000) +
				'\ntrailer<</Root 1 0 R>>\n%%EOF'
		],
		'load.pdf',
		{ type: 'application/pdf' }
	);

const clients = new Map();
const everyone = [...participants, ...jurors, admin];

console.log('1. Everybody logs in within 5 seconds');
await phase('logins', async () => {
	await Promise.all(
		everyone.map(async (u) => {
			await jitter(5000);
			const c = new Client();
			await c.login(u.email);
			clients.set(u.id, c);
		})
	);
});

console.log('2. Participants open their pages, repeatedly, like people refreshing');
await phase('browsing', async () => {
	await Promise.all(
		participants.map(async (u) => {
			const c = clients.get(u.id);
			for (let i = 0; i < 4; i++) {
				await jitter(1500);
				await c.data('my-submission', '/my-submission');
				await c.data('upload', '/upload');
				await c.request('page /my-submission', '/my-submission');
			}
		})
	);
});

console.log('3. Deadline rush: every team uploads a 500 KB PDF and two links at the same moment');
await phase('uploads', async () => {
	const seen = new Set();
	const reps = participants.filter((u) => !seen.has(u.team) && seen.add(u.team));
	const results = await Promise.all(
		reps.map(async (u) => {
			const c = clients.get(u.id);
			const a = await c.action('upload pdf', '/upload?/upload', {}, { file: pdf() });
			const b = await c.action('upload repo', '/upload?/upload', {
				repo_link: `https://github.com/load/${u.team}-${Date.now()}`
			});
			const v = await c.action('upload video', '/upload?/upload', {
				video_link: `https://youtu.be/${String(u.team).padEnd(11, 'x').slice(0, 11)}`
			});
			return [a, b, v].every((r) => r.data?.success === true);
		})
	);
	console.log(`  uploads that worked: ${results.filter(Boolean).length} of ${reps.length}`);
});

console.log('4. Jurors rate every team of their category while the admin watches the dashboard');
let rating = true;
const watcher = (async () => {
	const c = clients.get(admin.id);
	while (rating) {
		await c.data('admin dashboard', '/admin/dashboard');
		await c.data('admin ratings', '/admin/ratings');
		await sleep(1500);
	}
})();
await phase('ratings', async () => {
	await Promise.all(
		jurors.map(async (u) => {
			const c = clients.get(u.id);
			for (const category of u.jury_categories ?? []) {
				const data = await c.data('rate page', `/rate_presentation?category=${category}`);
				for (const team of data?.page?.teams ?? []) {
					await jitter(400);
					const r = await c.action('rate', '/rate_presentation', {
						teamId: team.id,
						implementation: String(1 + Math.floor(Math.random() * 10)),
						innovation: String(1 + Math.floor(Math.random() * 5)),
						usefulness: String(1 + Math.floor(Math.random() * 5)),
						comments: 'Load test feedback'
					});
					if (r.type !== 'success') record('rate FAILED', 0, r.type);
					await c.json('notes', '/api/jury/notes', 'PUT', { teamId: team.id, content: 'note' });
				}
				const r = await c.json('confirm', '/api/jury/confirm-grading', 'POST', {
					category,
					confirmed: true
				});
				if (r.res.status !== 200) record('confirm FAILED', 0, r.res.status);
			}
		})
	);
});
rating = false;
await watcher;

console.log('5. The admin unlocks and publishes all categories');
const adminClient = clients.get(admin.id);
await adminClient.json('unlock', '/api/admin/unlock', 'POST', { password: ACTION_PASSWORD });
const categories = [...new Set(teams.map((t) => t.category))];
for (const category of categories) {
	const r = await adminClient.action('publish', '/admin/dashboard?/publishCategory', {
		category,
		force: 'true'
	});
	console.log(
		`  ${category}: ${r.data?.success ? 'published' : `FAILED ${JSON.stringify(r.data)}`}`
	);
}

console.log('6. Everybody opens the ranking at the same moment, then refreshes');
await phase('ranking spike', async () => {
	await Promise.all(
		[...participants, ...jurors].map(async (u) => {
			const c = clients.get(u.id);
			for (let i = 0; i < 4; i++) {
				await jitter(i === 0 ? 300 : 2500);
				await c.data('ranking data', '/ranking');
				await c.request('page /ranking', '/ranking');
			}
		})
	);
});

console.log('\nRequest        count   p50 ms   p95 ms   p99 ms   max ms   statuses');
let bad = 0;
for (const [name, s] of [...stats].sort()) {
	const t = [...s.times].sort((a, b) => a - b);
	const statuses = [...s.statuses].map(([k, v]) => `${k}×${v}`).join(' ');
	for (const [k, v] of s.statuses) if (!/^(200|303|redirect|success)$/.test(String(k))) bad += v;
	console.log(
		`${name.padEnd(14)} ${String(t.length).padStart(5)} ${pct(t, 0.5).toFixed(0).padStart(8)} ${pct(t, 0.95).toFixed(0).padStart(8)} ${pct(t, 0.99).toFixed(0).padStart(8)} ${t.at(-1).toFixed(0).padStart(8)}   ${statuses}`
	);
}
console.log(`\nRequests with an unexpected status: ${bad}. App memory at the end: ${rss()} MB`);
process.exit(bad ? 1 : 0);
