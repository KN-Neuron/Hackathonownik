#!/usr/bin/env node
/**
 * Creates (or brings up to date) every PocketBase collection the app needs, with the fields and
 * API rules from the README. Safe to run again: missing fields are added, rules are re-applied.
 *
 *   POCKETBASE_URL=http://127.0.0.1:8090 \
 *   POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
 *   node scripts/pocketbase-setup.mjs
 *
 * Collections without rules are reachable only by the app through the superuser account.
 */
import 'dotenv/config';
import PocketBase from 'pocketbase';

const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;
if (!email || !password) {
	console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.');
	process.exit(1);
}

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(email, password);

const ADMIN = '@request.auth.role = "admin"';
const JURY = '@request.auth.role = "jury"';

/** Create the collection or add the fields it lacks, and (re)apply its rules. */
async function ensure(name, { fields = [], rules = {}, type = 'base' }) {
	let existing = null;
	try {
		existing = await pb.collections.getOne(name);
	} catch {
		// not there yet
	}
	// Rules not given stay null: superuser only
	const apply = {
		listRule: null,
		viewRule: null,
		createRule: null,
		updateRule: null,
		deleteRule: null,
		...rules
	};

	if (!existing) {
		await pb.collections.create({ name, type, fields, ...apply });
		console.log(`created ${name}`);
		return pb.collections.getOne(name);
	}

	const have = new Set(existing.fields.map((f) => f.name));
	const missing = fields.filter((f) => !have.has(f.name));
	await pb.collections.update(name, { fields: [...existing.fields, ...missing], ...apply });
	console.log(
		`${missing.length ? `updated ${name} (+${missing.map((f) => f.name).join(', ')})` : `ok ${name}`}`
	);
	return pb.collections.getOne(name);
}

const users = await pb.collections.getOne('users');

const teams = await ensure('teams', {
	fields: [
		{ name: 'name', type: 'text', required: true },
		{ name: 'category', type: 'text' }
	],
	rules: { listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""' }
});

// Users can't update their own record: they could change role, team or jury categories
await ensure('users', {
	fields: [
		{ name: 'role', type: 'text' },
		{ name: 'team', type: 'relation', collectionId: teams.id, maxSelect: 1 },
		{ name: 'admin', type: 'bool' },
		{ name: 'jury_categories', type: 'json' },
		{ name: 'confirmed_categories', type: 'json' }
	],
	rules: {
		listRule: `id = @request.auth.id || ${ADMIN}`,
		viewRule: `id = @request.auth.id || ${ADMIN}`
	}
});

await ensure('presentations', {
	fields: [
		{ name: 'team', type: 'relation', collectionId: teams.id, maxSelect: 1, required: true },
		{
			name: 'presentation',
			type: 'file',
			maxSelect: 1,
			maxSize: 41943040,
			mimeTypes: ['application/pdf']
		},
		{
			name: 'final_presentation',
			type: 'file',
			maxSelect: 1,
			maxSize: 41943040,
			mimeTypes: ['application/pdf']
		},
		{ name: 'repo_link', type: 'text' },
		{ name: 'video_link', type: 'text' },
		{ name: 'submitted_by', type: 'relation', collectionId: users.id, maxSelect: 1 },
		{ name: 'created', type: 'autodate', onCreate: true },
		{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
	],
	rules: {
		listRule: `team = @request.auth.team || ${ADMIN}`,
		viewRule: `team = @request.auth.team || ${ADMIN}`
	}
});

await ensure('ratings', {
	fields: [
		{ name: 'jury', type: 'relation', collectionId: users.id, maxSelect: 1, required: true },
		{ name: 'team', type: 'relation', collectionId: teams.id, maxSelect: 1, required: true },
		{ name: 'comments', type: 'text' },
		{ name: 'scores', type: 'json' },
		{ name: 'finalGrade', type: 'number' },
		{ name: 'created', type: 'autodate', onCreate: true },
		{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
	],
	rules: {
		// Jurors read only their own ratings directly; results go through the app
		listRule: `${ADMIN} || (${JURY} && jury = @request.auth.id)`,
		viewRule: `${ADMIN} || (${JURY} && jury = @request.auth.id)`,
		createRule: `(${JURY} || ${ADMIN}) && jury = @request.auth.id`,
		updateRule: `(${JURY} || ${ADMIN}) && jury = @request.auth.id`,
		deleteRule: ADMIN
	}
});

await ensure('event_state', {
	fields: [
		'published_categories',
		'published_at',
		'stages',
		'finalists',
		'tie_winners',
		'orders',
		'on_stage'
	].map((name) => ({ name, type: 'json' }))
});

await ensure('jury_notes', {
	fields: [
		{ name: 'jury', type: 'relation', collectionId: users.id, maxSelect: 1, required: true },
		{ name: 'team', type: 'relation', collectionId: teams.id, maxSelect: 1, required: true },
		{ name: 'content', type: 'text', max: 10000 }
	]
});

await ensure('jury_views', {
	fields: [
		{ name: 'jury', type: 'relation', collectionId: users.id, maxSelect: 1, required: true },
		{ name: 'team', type: 'relation', collectionId: teams.id, maxSelect: 1, required: true },
		{ name: 'item', type: 'text', required: true },
		{ name: 'count', type: 'number' },
		{ name: 'first_at', type: 'text' },
		{ name: 'last_at', type: 'text' }
	]
});

await ensure('admin_audit', {
	fields: [
		{ name: 'admin', type: 'relation', collectionId: users.id, maxSelect: 1 },
		{ name: 'admin_email', type: 'text' },
		{ name: 'action', type: 'text', required: true },
		{ name: 'ok', type: 'bool' },
		{ name: 'ip', type: 'text' },
		{ name: 'details', type: 'json' },
		{ name: 'created', type: 'autodate', onCreate: true }
	]
});

console.log('PocketBase is set up.');
