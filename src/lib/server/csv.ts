/**
 * Parse CSV text into rows of cells. Handles quotes, escaped quotes, a UTF-8 BOM and both
 * "," and ";" as separators (Excel in Polish locales exports with ";").
 */
export function parseCsv(text: string): string[][] {
	const source = text.replace(/^﻿/, '');
	const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
	const delimiter =
		(firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;

	for (let i = 0; i < source.length; i++) {
		const ch = source[i];
		if (quoted) {
			if (ch === '"' && source[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (ch === '"') {
				quoted = false;
			} else {
				cell += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === delimiter) {
			row.push(cell);
			cell = '';
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && source[i + 1] === '\n') i++;
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else {
			cell += ch;
		}
	}
	if (cell !== '' || row.length) {
		row.push(cell);
		rows.push(row);
	}

	return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

/** Quote a cell for CSV output. */
export function csvCell(value: string): string {
	return /[",;\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
