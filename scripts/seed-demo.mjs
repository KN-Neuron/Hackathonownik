#!/usr/bin/env node
/**
 * Fills a PocketBase (set up with scripts/pocketbase-setup.mjs) with an event-sized demo: teams
 * per category, 3–4 participants per team, 3 jurors per category, two admins and a submission for
 * every team. For local testing and staging only, never run it against production.
 *
 *   DEMO_PASSWORD=choose-one node scripts/seed-demo.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import yaml from 'js-yaml';
import PocketBase from 'pocketbase';

const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const password = process.env.DEMO_PASSWORD;
if (!password) {
	console.error('Set DEMO_PASSWORD (the password every demo account gets).');
	process.exit(1);
}

const config = yaml.load(fs.readFileSync('app_config.yaml', 'utf8')).event;
const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb
	.collection('_superusers')
	.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD);

// Teams per category as announced for Heroes of the Brain 2026
const teamCounts = { adaptive: 16, handsfree: 16, fnirs: 10, neurogaming: 10, neurorehab: 10 };

/** A small valid PDF: one 16:9 page per title. */
function slides(titles) {
	const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];
	objects.push(
		`<< /Type /Pages /Kids [${titles.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${titles.length} >>`
	);
	objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
	titles.forEach((title, i) => {
		const text = title.replace(/[()\\]/g, '');
		const stream = `0.08 0.09 0.13 rg 0 0 960 540 re f 0.5 0.48 1 rg BT /F1 44 Tf 60 300 Td (${text}) Tj ET 1 1 1 rg BT /F1 22 Tf 60 240 Td (Slide ${i + 1} of ${titles.length}) Tj ET`;
		objects.push(
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`
		);
		objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
	});
	let pdf = '%PDF-1.4\n';
	const offsets = [];
	objects.forEach((body, i) => {
		offsets.push(pdf.length);
		pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
	});
	const xref = pdf.length;
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
	return new Blob([pdf], { type: 'application/pdf' });
}

const user = (data) =>
	pb.collection('users').create({ ...data, password, passwordConfirm: password, verified: true });

const words = [
	'Neuro',
	'Cortex',
	'Synapse',
	'Alpha',
	'Theta',
	'Gamma',
	'Delta',
	'Spike',
	'Axon',
	'Mind'
];
const kinds = ['Labs', 'Squad', 'Crew', 'Hackers', 'Team'];
let n = 0;
let participants = 0;

for (const category of config.categories) {
	const count = teamCounts[category.key] ?? 8;
	for (let j = 1; j <= 3; j++) {
		await user({
			email: `jury-${category.key}-${j}@demo.test`,
			name: `Juror ${j} (${category.key})`,
			role: 'jury',
			jury_categories: [category.key]
		});
	}
	for (let t = 0; t < count; t++, n++) {
		const name = `${words[n % words.length]} ${kinds[n % kinds.length]} ${n + 1}`;
		const team = await pb.collection('teams').create({ name, category: category.key });
		const members = [];
		for (let m = 1; m <= 3 + (n % 2); m++) {
			members.push(
				await user({
					email: `p${n + 1}-${m}@demo.test`,
					name: `Participant ${n + 1}.${m}`,
					role: 'participant',
					team: team.id
				})
			);
			participants++;
		}
		const form = new FormData();
		form.append('team', team.id);
		form.append('submitted_by', members[0].id);
		form.append(
			'presentation',
			slides([name, 'Problem and idea', 'Demo and results']),
			'slides.pdf'
		);
		form.append(
			'final_presentation',
			slides([`${name} - FINAL`, 'What we built', 'Live demo']),
			'final.pdf'
		);
		form.append('repo_link', `https://github.com/demo/team-${n + 1}`);
		// Same defaults as the app: a category's own list, else the event's, else everything
		const required = category.submission?.required ?? config.submission?.required ?? ['video'];
		if (required.includes('video')) {
			form.append('video_link', 'https://youtu.be/dQw4w9WgXcQ');
		}
		await pb.collection('presentations').create(form);
	}
}

for (const e of ['admin@demo.test', 'admin2@demo.test']) {
	await user({ email: e, name: e.split('@')[0], role: 'admin' });
}
console.log(
	`Demo ready: ${n} teams, ${participants} participants, ${config.categories.length * 3} jurors, 2 admins.`
);
console.log(
	`Log in with e.g. admin@demo.test / jury-adaptive-1@demo.test / p1-1@demo.test and the DEMO_PASSWORD.`
);
