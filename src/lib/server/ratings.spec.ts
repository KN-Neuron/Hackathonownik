import { describe, expect, it } from 'vitest';
import { appConfig } from './appConfig';
import { parseScores } from './ratings';

const criteria = appConfig.event.rating_criteria;
const validForm = Object.fromEntries(criteria.map((c) => [c.key, String(c.maxScore)]));

describe('parseScores', () => {
	it('accepts scores within range and sums them', () => {
		const parsed = parseScores(validForm);
		expect(parsed).toEqual({
			ok: true,
			scores: Object.fromEntries(criteria.map((c) => [c.key, c.maxScore])),
			finalGrade: criteria.reduce((sum, c) => sum + c.maxScore, 0)
		});
	});

	it('rejects a score above maxScore', () => {
		const [first] = criteria;
		const parsed = parseScores({ ...validForm, [first.key]: String(first.maxScore + 1) });
		expect(parsed.ok).toBe(false);
	});

	it.each(['-1', '2.5', 'abc', ''])('rejects %j', (value) => {
		const parsed = parseScores({ ...validForm, [criteria[0].key]: value });
		expect(parsed.ok).toBe(false);
	});

	it('rejects a missing criterion', () => {
		const { [criteria[0].key]: _omitted, ...rest } = validForm;
		expect(parseScores(rest).ok).toBe(false);
	});
});
