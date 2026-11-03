import { describe, expect, it } from 'vitest';
import type { Presentation } from '$lib/types';
import { mergeTeamRecords } from './submissions';

function record(
	id: string,
	created: string,
	fields: Partial<Pick<Presentation, 'presentation' | 'repo_link' | 'video_link'>>,
	submitter?: string
): Presentation {
	return {
		collectionId: 'c',
		collectionName: 'presentations',
		id,
		team: 'team1',
		created,
		updated: created,
		presentation: '',
		...fields,
		expand: {
			team: { id: 'team1', name: 'Neuron Team', category: 'wellness' },
			...(submitter ? { submitted_by: { id: submitter, name: submitter } } : {})
		}
	};
}

const ALL = ['presentation', 'repo', 'video'] as const;

describe('mergeTeamRecords', () => {
	it('keeps earlier items when a later upload only adds a video', () => {
		const merged = mergeTeamRecords(
			[
				record('r2', '2026-11-30 10:00:00', { video_link: 'https://youtu.be/x' }, 'Bob'),
				record(
					'r1',
					'2026-11-30 09:00:00',
					{ presentation: 'slides.pdf', repo_link: 'https://github.com/a/b' },
					'Alice'
				)
			],
			[...ALL]
		);

		expect(merged.presentation).toMatchObject({
			recordId: 'r1',
			url: '/api/presentations/r1',
			fileName: 'slides.pdf',
			submittedBy: 'Alice'
		});
		expect(merged.repo).toMatchObject({ url: 'https://github.com/a/b', submittedBy: 'Alice' });
		expect(merged.video).toMatchObject({ url: 'https://youtu.be/x', submittedBy: 'Bob' });
		expect(merged.complete).toBe(true);
		expect(merged.missing).toEqual([]);
		expect(merged.lastUpdated).toBe('2026-11-30 10:00:00');
	});

	it('uses the newest version of a replaced item regardless of input order', () => {
		const merged = mergeTeamRecords(
			[
				record('old', '2026-11-30 08:00:00', { presentation: 'v1.pdf' }),
				record('new', '2026-11-30 11:00:00', { presentation: 'v2.pdf' })
			],
			[...ALL]
		);

		expect(merged.presentation?.fileName).toBe('v2.pdf');
		expect(merged.history.map((h) => h.recordId)).toEqual(['new', 'old']);
	});

	it('reports missing required items only', () => {
		const merged = mergeTeamRecords(
			[record('r1', '2026-11-30 09:00:00', { repo_link: 'https://github.com/a/b' })],
			['presentation', 'repo']
		);

		expect(merged.missing).toEqual(['presentation']);
		expect(merged.complete).toBe(false);
		expect(merged.video).toBeNull();
		expect(merged.history[0]).toMatchObject({ items: ['repo'], submittedBy: null });
	});
});
