import { describe, expect, it } from 'vitest';
import { csvCell, parseCsv } from './csv';
import { planImport } from './participantImport';

const categories = [
	{ key: 'adaptive', name: 'Adaptive Systems' },
	{ key: 'fnirs', name: 'Breath, Brain and Body (fNIRS)' }
];
const none = { teams: [], emails: new Set<string>() };

describe('parseCsv', () => {
	it('handles quotes, commas in cells, BOM and CRLF', () => {
		expect(parseCsv('﻿name,team\r\n"Kowalski, Jan","Neuro ""Labs"""\r\n')).toEqual([
			['name', 'team'],
			['Kowalski, Jan', 'Neuro "Labs"']
		]);
	});
	it('detects the semicolon separator of Polish Excel', () => {
		expect(parseCsv('a;b\n1;2')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
	it('quotes output cells when needed', () => {
		expect(csvCell('a,b')).toBe('"a,b"');
		expect(csvCell('plain')).toBe('plain');
	});
});

describe('planImport', () => {
	const csv = (rows: string[]) => ['Imię i nazwisko;E-mail;Zespół;Kategoria', ...rows].join('\n');

	it('plans participants, new teams and accepts Polish headers and category names', () => {
		const plan = planImport(
			csv([
				'Jan Kowalski;JAN@x.pl;Neuro Labs;adaptive',
				'Anna Nowak;anna@x.pl;Neuro Labs;Adaptive Systems',
				'Ewa Lis;ewa@x.pl;Neuro Labs;adaptive',
				'Piotr Wąs;piotr@x.pl;Gamma;fnirs'
			]),
			categories,
			none
		);
		expect(plan.errors).toEqual([]);
		expect(plan.participants.map((p) => p.email)).toEqual([
			'jan@x.pl',
			'anna@x.pl',
			'ewa@x.pl',
			'piotr@x.pl'
		]);
		expect(plan.newTeams).toEqual([
			{ name: 'Gamma', category: 'fnirs', members: 1 },
			{ name: 'Neuro Labs', category: 'adaptive', members: 3 }
		]);
		// Gamma has a single person
		expect(plan.warnings).toEqual(['Team "Gamma" has 1 person (rules: 3–4).']);
	});

	it('rejects bad rows with their line number', () => {
		const plan = planImport(
			csv([
				'Jan;not-an-email;A;adaptive',
				'Anna;a@x.pl;A;nope',
				'Ewa;e@x.pl;;adaptive',
				'Ola;a@x.pl;B;adaptive',
				'Ola 2;a@x.pl;B;adaptive'
			]),
			categories,
			none
		);
		expect(plan.errors.map((e) => e.line)).toEqual([2, 3, 4, 6]);
		expect(plan.errors[3].message).toContain('twice');
	});

	it('flags a team in two categories and a team that exists in another one', () => {
		const plan = planImport(
			csv(['A;a@x.pl;T1;adaptive', 'B;b@x.pl;T1;fnirs', 'C;c@x.pl;Old;adaptive']),
			categories,
			{ teams: [{ name: 'old', category: 'fnirs' }], emails: new Set() }
		);
		expect(plan.errors.map((e) => e.line)).toEqual([3, 4]);
	});

	it('skips existing accounts and reuses existing teams', () => {
		const plan = planImport(csv(['A;a@x.pl;Old;adaptive', 'B;b@x.pl;Old;adaptive']), categories, {
			teams: [{ name: 'Old', category: 'adaptive' }],
			emails: new Set(['a@x.pl'])
		});
		expect(plan.skipped.map((s) => s.line)).toEqual([2]);
		expect(plan.participants.map((p) => p.email)).toEqual(['b@x.pl']);
		expect(plan.newTeams).toEqual([]);
	});

	it('explains missing columns', () => {
		const plan = planImport('name,email\nA,a@x.pl', categories, none);
		expect(plan.errors[0].message).toContain('team, category');
	});
});
