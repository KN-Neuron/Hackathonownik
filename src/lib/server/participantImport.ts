import { parseCsv } from './csv';

export interface ImportCategory {
	key: string;
	name: string;
}

export interface ImportRow {
	line: number;
	name: string;
	email: string;
	team: string;
	category: string;
}

export interface ImportProblem {
	line: number;
	message: string;
}

export interface ImportPlan {
	/** Participants that will be created (their team is created too if it doesn't exist yet) */
	participants: ImportRow[];
	/** Teams that will be created: lower-cased name → team */
	newTeams: { name: string; category: string; members: number }[];
	/** Rows that can't be imported (the file is rejected until they're fixed) */
	errors: ImportProblem[];
	/** Rows skipped because the account already exists */
	skipped: ImportProblem[];
	/** Things to look at, e.g. a team with 2 or 5 people */
	warnings: string[];
}

// Header names accepted for every column (English and Polish)
const HEADERS: Record<'name' | 'email' | 'team' | 'category', string[]> = {
	name: ['name', 'full name', 'imię i nazwisko', 'imie i nazwisko', 'imię', 'imie', 'uczestnik'],
	email: ['email', 'e-mail', 'mail', 'adres e-mail', 'adres email'],
	team: ['team', 'team name', 'zespół', 'zespol', 'drużyna', 'druzyna', 'nazwa zespołu'],
	category: ['category', 'kategoria', 'track']
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turn a CSV (columns: name, email, team, category) into an import plan.
 * Pure: it only reads the existing teams and e-mails it is given.
 */
export function planImport(
	csv: string,
	categories: ImportCategory[],
	existing: { teams: { name: string; category: string }[]; emails: Set<string> }
): ImportPlan {
	const plan: ImportPlan = {
		participants: [],
		newTeams: [],
		errors: [],
		skipped: [],
		warnings: []
	};
	const rows = parseCsv(csv);
	if (rows.length < 2) {
		plan.errors.push({ line: 1, message: 'The file has no data rows.' });
		return plan;
	}

	const header = rows[0].map((h) => h.toLowerCase());
	const column = (key: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[key].includes(h));
	const index = {
		name: column('name'),
		email: column('email'),
		team: column('team'),
		category: column('category')
	};
	const missing = (Object.keys(index) as (keyof typeof index)[]).filter((k) => index[k] < 0);
	if (missing.length) {
		plan.errors.push({
			line: 1,
			message: `Missing column(s): ${missing.join(', ')}. Expected a header row: name, email, team, category.`
		});
		return plan;
	}

	const categoryOf = (value: string) =>
		categories.find(
			(c) =>
				c.key.toLowerCase() === value.toLowerCase() || c.name.toLowerCase() === value.toLowerCase()
		);
	const teamKey = (name: string) => name.trim().toLowerCase();
	const known = new Map(existing.teams.map((t) => [teamKey(t.name), t]));
	const seenEmails = new Set<string>();
	const teamCategory = new Map<string, string>(); // team key → category key within the file
	const members = new Map<string, number>(); // team key → people to be added

	rows.slice(1).forEach((cells, i) => {
		const line = i + 2;
		const row = {
			name: cells[index.name] ?? '',
			email: (cells[index.email] ?? '').toLowerCase(),
			team: cells[index.team] ?? '',
			category: cells[index.category] ?? ''
		};
		const fail = (message: string) => plan.errors.push({ line, message });

		if (!row.name) return fail('Missing name.');
		if (!EMAIL.test(row.email)) return fail(`"${row.email}" is not a valid e-mail.`);
		if (!row.team) return fail('Missing team.');
		const category = categoryOf(row.category);
		if (!category) {
			return fail(
				`Unknown category "${row.category}". Use one of: ${categories.map((c) => c.key).join(', ')}.`
			);
		}
		if (seenEmails.has(row.email)) return fail(`${row.email} appears twice in the file.`);
		seenEmails.add(row.email);

		const key = teamKey(row.team);
		const existingTeam = known.get(key);
		if (existingTeam && existingTeam.category !== category.key) {
			return fail(
				`Team "${row.team}" already exists in category ${existingTeam.category}, not ${category.key}.`
			);
		}
		const inFile = teamCategory.get(key);
		if (inFile && inFile !== category.key) {
			return fail(
				`Team "${row.team}" is listed in two categories (${inFile} and ${category.key}).`
			);
		}
		if (existing.emails.has(row.email)) {
			plan.skipped.push({ line, message: `${row.email} already has an account.` });
			return;
		}

		teamCategory.set(key, category.key);
		members.set(key, (members.get(key) ?? 0) + 1);
		plan.participants.push({ line, ...row, category: category.key });
	});

	for (const [key, category] of teamCategory) {
		const name = plan.participants.find((p) => teamKey(p.team) === key)!.team;
		const count = members.get(key) ?? 0;
		if (!known.has(key)) plan.newTeams.push({ name, category, members: count });
		// Rules §4: 3–4 people per team (a single person may be assigned to a team later)
		if (!known.has(key) && (count < 3 || count > 4)) {
			plan.warnings.push(
				`Team "${name}" has ${count} ${count === 1 ? 'person' : 'people'} (rules: 3–4).`
			);
		}
	}
	plan.newTeams.sort((a, b) => a.name.localeCompare(b.name));
	return plan;
}
