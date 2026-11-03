import { json } from '@sveltejs/kit';
import { canSeeInternalResults, resultsClient } from '$lib/server/access';
import { appConfig, getCategory } from '$lib/server/appConfig';
import { getCategoryRanking } from '$lib/server/ranking';
import type { RequestHandler } from './$types';

// Markdown export of one category's ranking with every jury rating: ?category=<key>
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	// Exports include every team's feedback, so they stay internal
	const category = url.searchParams.get('category');
	if (!(await canSeeInternalResults(locals, category))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	try {
		const { criteria, rankings, totalJuries } = await getCategoryRanking(category!);
		const categoryName = getCategory(category)?.name ?? category;
		const pb = await resultsClient();

		const header = criteria.map((c) => `| ${c.name} `).join('');
		const separator = criteria.map(() => '|:-----------:').join('');

		let md = `# ${appConfig.event.name} ${appConfig.event.year} – ${categoryName}\n\n`;
		md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
		md += `**Teams:** ${rankings.length} | **Jurors:** ${totalJuries}\n\n`;
		md += '## Ranking (average of the jury scores)\n\n';
		md += `| Rank | Team ${header}| Total | Status |\n`;
		md += `|:----:|------${separator}|:-----:|:------:|\n`;

		rankings.forEach((team, index) => {
			const values = criteria.map((c) => `| ${team.scores[c.key].toFixed(2)} `).join('');
			md += `| ${index + 1} | **${team.team}** ${values}| **${team.finalGrade.toFixed(2)}** | ${team.status} (${team.ratingCount}/${totalJuries}) |\n`;
		});

		for (const team of rankings) {
			const ratings = await pb.collection('ratings').getFullList({
				filter: pb.filter('team = {:team}', { team: team.teamId }),
				expand: 'jury'
			});
			if (!ratings.length) continue;

			md += `\n---\n## ${team.team}\n\n`;
			md += `| Juror ${header}| Total |\n|-------${separator}|:-----:|\n`;
			for (const rating of ratings) {
				const values = criteria.map((c) => `| ${Number(rating.scores?.[c.key]) || 0} `).join('');
				md += `| ${rating.expand?.jury?.name || 'Unknown'} ${values}| ${rating.finalGrade ?? 0} |\n`;
			}

			const feedback = ratings.filter((r) => r.comments?.trim());
			if (feedback.length) {
				md += '\n**Feedback:**\n\n';
				feedback.forEach(
					(r) => (md += `- **${r.expand?.jury?.name || 'Unknown'}:** ${r.comments}\n`)
				);
			}
		}

		md += `\n---\n*${appConfig.event.name} ${appConfig.event.year} © ${appConfig.event.organizer}*\n`;

		const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		return new Response(md, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="${slug(appConfig.event.name)}-${category}-ranking.md"`
			}
		});
	} catch (err) {
		console.error('Error generating markdown:', err);
		return json({ error: 'Failed to generate markdown' }, { status: 500 });
	}
};
