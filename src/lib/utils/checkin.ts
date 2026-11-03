export type CheckinStatus = 'off' | 'done' | 'open' | 'missed';

/**
 * done: the team uploaded something before the check-in deadline;
 * open: nothing yet, deadline still ahead; missed: nothing before the deadline;
 * off: no check-in configured.
 */
export function checkinStatus(
	deadline: string | undefined,
	firstSubmittedAt: string | null | undefined,
	now = Date.now()
): CheckinStatus {
	if (!deadline) return 'off';
	const limit = new Date(deadline).getTime();
	if (firstSubmittedAt && new Date(firstSubmittedAt.replace(' ', 'T')).getTime() <= limit)
		return 'done';
	return now <= limit ? 'open' : 'missed';
}
