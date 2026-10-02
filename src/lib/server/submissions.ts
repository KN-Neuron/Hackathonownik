import type PocketBase from 'pocketbase';
import type { Presentation, SubmissionEntry, SubmissionItem, TeamSubmission } from '$lib/types';
import { appConfig } from './appConfig';

function submitterName(record: Presentation): string | null {
	const user = record.expand?.submitted_by;
	return user?.name || user?.email || null;
}

function itemsIn(record: Presentation): SubmissionItem[] {
	const items: SubmissionItem[] = [];
	if (record.presentation) items.push('presentation');
	if (record.repo_link) items.push('repo');
	if (record.video_link) items.push('video');
	return items;
}

function entryFor(record: Presentation, item: SubmissionItem): SubmissionEntry {
	const base = { recordId: record.id, submittedBy: submitterName(record), at: record.created };
	switch (item) {
		case 'presentation':
			return { ...base, url: `/api/presentations/${record.id}`, fileName: record.presentation };
		case 'repo':
			return { ...base, url: record.repo_link! };
		case 'video':
			return { ...base, url: record.video_link! };
	}
}

/**
 * Merge a team's partial uploads: every item (PDF / repo / video) comes from the newest
 * record that contains it, so adding only a video later doesn't hide the earlier PDF.
 * Records must belong to a single team.
 */
export function mergeTeamRecords(
	records: Presentation[],
	required: SubmissionItem[]
): TeamSubmission {
	const sorted = [...records].sort((a, b) => b.created.localeCompare(a.created));
	const newest = sorted[0];

	const latest: Record<SubmissionItem, SubmissionEntry | null> = {
		presentation: null,
		repo: null,
		video: null
	};
	for (const record of sorted) {
		for (const item of itemsIn(record)) {
			latest[item] ??= entryFor(record, item);
		}
	}

	const missing = required.filter((item) => !latest[item]);

	return {
		teamId: newest.team,
		teamName: newest.expand?.team?.name || 'Unknown Team',
		category: newest.expand?.team?.category || appConfig.event.categories[0]?.key || 'wellness',
		...latest,
		missing,
		complete: missing.length === 0,
		lastUpdated: newest.created,
		history: sorted.map((record) => ({
			recordId: record.id,
			at: record.created,
			submittedBy: submitterName(record),
			items: itemsIn(record)
		}))
	};
}

/** Merged submissions of every team (or a single one), newest activity first. */
export async function getTeamSubmissions(
	pb: PocketBase,
	options: { teamId?: string } = {}
): Promise<TeamSubmission[]> {
	const records = await pb.collection('presentations').getFullList<Presentation>({
		sort: '-created',
		expand: 'team,submitted_by',
		...(options.teamId ? { filter: pb.filter('team = {:team}', { team: options.teamId }) } : {})
	});

	const byTeam = new Map<string, Presentation[]>();
	for (const record of records) {
		if (!record.team) continue;
		const list = byTeam.get(record.team) ?? [];
		list.push(record);
		byTeam.set(record.team, list);
	}

	const required = appConfig.event.submission.required;
	return Array.from(byTeam.values()).map((teamRecords) => mergeTeamRecords(teamRecords, required));
}

export async function getTeamSubmission(
	pb: PocketBase,
	teamId: string
): Promise<TeamSubmission | null> {
	const [submission] = await getTeamSubmissions(pb, { teamId });
	return submission ?? null;
}
