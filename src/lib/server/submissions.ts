import type { Presentation, SubmissionEntry, SubmissionItem, TeamSubmission } from '$lib/types';
import { requiredFor } from './appConfig';
import { getAdminClient } from './adminClient';

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
		// Teams without a valid category are shown to admins only
		category: newest.expand?.team?.category || '',
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

/**
 * Merged submissions of every team (or a single one), newest activity first.
 * Reads as superuser so submitter names resolve even when users can't see each other;
 * callers must check access (participants: own team only; jury/admin pages: role).
 */
export async function getTeamSubmissions(
	options: { teamId?: string; categories?: string[] } = {}
): Promise<TeamSubmission[]> {
	const pb = await getAdminClient();
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

	// Required items depend on the team's (current) category
	const merged = Array.from(byTeam.values()).map((teamRecords) =>
		mergeTeamRecords(teamRecords, requiredFor(teamRecords[0].expand?.team?.category))
	);
	return options.categories
		? merged.filter((s) => options.categories!.includes(s.category))
		: merged;
}

export async function getTeamSubmission(teamId: string): Promise<TeamSubmission | null> {
	const [submission] = await getTeamSubmissions({ teamId });
	return submission ?? null;
}
