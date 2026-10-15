export type ReportedItem = 'video' | 'repo';

/** Tell the server a juror opened an external link (PDFs are recorded when the file is served). */
export function reportView(teamId: string, item: ReportedItem): void {
	fetch('/api/jury/views', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ teamId, item })
	}).catch(() => {});
}
