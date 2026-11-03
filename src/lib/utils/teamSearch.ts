/** Match a team by part of its name or by its number in the presentation order ("3" or "#3"). */
export function matchesTeam(query: string, name: string, order?: number): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const number = q.replace(/^#/, '');
	if (order !== undefined && /^\d+$/.test(number)) return String(order) === number;
	return name.toLowerCase().includes(q);
}
