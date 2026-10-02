import { describe, expect, it } from 'vitest';
import type PocketBase from 'pocketbase';
import { getRatingProgress } from './results';

function fakePb(data: {
	presentations: { team: string }[];
	ratings: { jury: string; team: string }[];
	juries: { id: string; name: string; confirmedRating?: boolean }[];
}): PocketBase {
	const collections: Record<string, unknown[]> = {
		presentations: data.presentations,
		ratings: data.ratings,
		users: data.juries
	};
	return {
		collection: (name: string) => ({ getFullList: async () => collections[name] })
	} as unknown as PocketBase;
}

describe('getRatingProgress', () => {
	const presentations = [{ team: 't1' }, { team: 't1' }, { team: 't2' }];

	it('is ready when every jury rated every submitting team and confirmed', async () => {
		const progress = await getRatingProgress(
			fakePb({
				presentations,
				ratings: [
					{ jury: 'j1', team: 't1' },
					{ jury: 'j1', team: 't2' },
					{ jury: 'j2', team: 't1' },
					{ jury: 'j2', team: 't2' }
				],
				juries: [
					{ id: 'j1', name: 'A', confirmedRating: true },
					{ id: 'j2', name: 'B', confirmedRating: true }
				]
			})
		);
		expect(progress.totalTeams).toBe(2);
		expect(progress.readyToPublish).toBe(true);
	});

	it('is not ready while a jury member has not confirmed', async () => {
		const progress = await getRatingProgress(
			fakePb({
				presentations,
				ratings: [
					{ jury: 'j1', team: 't1' },
					{ jury: 'j1', team: 't2' }
				],
				juries: [{ id: 'j1', name: 'A', confirmedRating: false }]
			})
		);
		expect(progress.readyToPublish).toBe(false);
		expect(progress.confirmedCount).toBe(0);
	});

	it('is not ready when a confirmed jury member skipped a team', async () => {
		const progress = await getRatingProgress(
			fakePb({
				presentations,
				ratings: [{ jury: 'j1', team: 't1' }],
				juries: [{ id: 'j1', name: 'A', confirmedRating: true }]
			})
		);
		expect(progress.juries[0].ratedTeams).toBe(1);
		expect(progress.readyToPublish).toBe(false);
	});

	it('is not ready without any jury', async () => {
		const progress = await getRatingProgress(fakePb({ presentations, ratings: [], juries: [] }));
		expect(progress.readyToPublish).toBe(false);
	});
});
