import { json } from '@sveltejs/kit';
import { appConfig } from '$lib/server/appConfig';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url, fetch }) => {
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	try {
		// Fetch main rankings data
		const rankingResponse = await fetch('/api/rankings/data');
		if (!rankingResponse.ok) {
			throw new Error('Failed to fetch rankings data');
		}

		const rankingData = await rankingResponse.json();
		const { rankings, totalJuries } = rankingData;

		// Create markdown content with better visual structure
		let markdownContent = `# ${appConfig.event.name} ${appConfig.event.year} - Rankings\n\n`;
		markdownContent += `**Generated:** ${new Date().toLocaleString()}\n\n`;
		markdownContent += `**Total Teams:** ${rankings.length} | **Total Juries:** ${totalJuries}\n\n`;

		markdownContent += '## 🏆 Overall Rankings\n\n';
		
		const criteriaHeaders = appConfig.event.rating_criteria.map(c => `| ${c.name} `).join('');
		const criteriaSeparators = appConfig.event.rating_criteria.map(() => `|:-----------:`).join('');
		
		markdownContent += `| 🏅 Rank | 🏷️ Team | 📊 Category ${criteriaHeaders}| 🎯 Final Grade | 📋 Status |\n`;
		markdownContent += `|:------:|--------|:----------:${criteriaSeparators}|:----------:|:------:|\n`;

		rankings.forEach((team, index) => {
			const statusText = team.status === 'final'
				? `Final (${team.ratingCount}/${totalJuries})`
				: `Provisional (${team.ratingCount}/${totalJuries})`;

			const categoryDisplay = appConfig.event.categories.find(c => c.key === team.category)?.name || 'N/A';
			
			const criteriaValues = appConfig.event.rating_criteria
				.map(c => `| \`${team[c.key]?.toFixed(1) || '0.0'}\` `)
				.join('');

			markdownContent += `| ${index + 1} | **${team.team}** | ${categoryDisplay} ${criteriaValues}| **\`${team.finalGrade.toFixed(2)}\`** | ${statusText} |\n`;
		});

		// Add a section for each team with individual jury ratings
		for (const team of rankings) {
			const teamRatingsResponse = await fetch(`/api/ratings/team-details?teamId=${team.teamId}`);
			if (teamRatingsResponse.ok) {
				const teamRatingsData = await teamRatingsResponse.json();
				const ratings = teamRatingsData.ratings || [];

				if (ratings.length > 0) {
					markdownContent += `\n---\n## 📋 Individual Jury Ratings: ${team.team}\n\n`;
					markdownContent += `> **Average Final Grade:** \`${team.finalGrade.toFixed(2)}\`\n\n`;

					markdownContent += `| 👤 Jury ${criteriaHeaders}| 🎯 Final Grade |\n`;
					markdownContent += `|--------${criteriaSeparators}|:----------:|\n`;

					ratings.forEach(rating => {
						const juryCriteriaValues = appConfig.event.rating_criteria
							.map(c => `| \`${rating[c.key]?.toFixed(1) || '0'}\` `)
							.join('');
						markdownContent += `| ${rating.juryName} ${juryCriteriaValues}| **\`${rating.finalGrade.toFixed(2)}\`** |\n`;
					});

					// Add comments section if any jury has comments
					const ratingsWithComments = ratings.filter(r => r.comments && r.comments.trim());
					if (ratingsWithComments.length > 0) {
						markdownContent += `\n### 💬 Jury Comments:\n\n`;
						ratingsWithComments.forEach(rating => {
							if (rating.comments && rating.comments.trim()) {
								markdownContent += `- **${rating.juryName}:** ${rating.comments}\n\n`;
							}
						});
					}

					markdownContent += '\n';
				}
			}
		}

		markdownContent += '\n---\n';
		markdownContent += `*${appConfig.event.name} ${appConfig.event.year} © ${appConfig.event.organizer}*\n`;

		// Set proper UTF-8 encoding for the response - use the markdown content directly
		// to ensure proper Unicode character handling
		return new Response(markdownContent, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="${appConfig.event.name.toLowerCase().replace(/ /g, '-')}-rankings-${new Date().toISOString().slice(0, 10)}.md"`
			}
		});
	} catch (err) {
		console.error('Error generating markdown:', err);
		return json({ error: 'Failed to generate markdown', details: err.message }, { status: 500 });
	}
};