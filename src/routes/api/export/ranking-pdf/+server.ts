import { json } from '@sveltejs/kit';
import { appConfig } from '$lib/server/appConfig';
import type { RequestHandler } from './$types';
import puppeteer from 'puppeteer';

export const GET: RequestHandler = async ({ locals, url, fetch }) => {
	
	if (!locals.user) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}

	try {
		
		const rankingResponse = await fetch('/api/rankings/data');
		if (!rankingResponse.ok) {
			throw new Error('Failed to fetch rankings data');
		}

		const rankingData = await rankingResponse.json();
		const { rankings, totalJuries } = rankingData;

		
		const browser = await puppeteer.launch({
			headless: 'new',
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-web-security',
				'--font-render-hinting=none',
				'--disable-features=VizDisplayCompositor,FontSrcLocal',
				'--lang=pl-PL',
				'--accept-lang=pl-PL',
				'--disable-gpu'
			]
		});
		const page = await browser.newPage();

		
		const htmlContent = `
			<!DOCTYPE html>
			<html lang="pl">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${appConfig.event.name} ${appConfig.event.year} - Rankings</title>
				<style>
					@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700&display=swap');

					body {
						font-family: 'Lato', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
						margin: 0;
						padding: 20px;
						color: #333;
						line-height: 1.4;
					}
					h1 {
						text-align: center;
						margin-bottom: 20px;
						color: #3b82f6;
						font-size: 24px;
					}
					.metadata {
						text-align: center;
						margin-bottom: 30px;
						font-size: 14px;
						color: #666;
					}
					table {
						width: 100%;
						border-collapse: collapse;
						margin-bottom: 20px;
						font-size: 12px;
					}
					th, td {
						padding: 8px 5px;
						border: 1px solid #ddd;
						text-align: left;
					}
					th {
						background-color: #f2f2f2;
						font-weight: bold;
						text-align: center;
					}
					tr:nth-child(even) {
						background-color: #f9f9f9;
					}
					.rank {
						font-weight: bold;
						text-align: center;
					}
					.team {
						font-weight: bold;
					}
					.final-grade {
						font-weight: bold;
					}
					.good { color: #36c399; }
					.medium { color: #f7a654; }
					.low { color: #e85c90; }
					.status-final { color: #36c399; }
					.status-provisional { color: #f7a654; }
					.footer {
						margin-top: 40px;
						text-align: center;
						font-size: 12px;
						color: #999;
					}
				</style>
			</head>
			<body>
				<h1>${appConfig.event.name} ${appConfig.event.year} - Rankings</h1>
				<div class="metadata">
					<p>Generated: ${new Date().toLocaleString()}</p>
					<p>Total Teams: ${rankings.length} | Total Juries: ${totalJuries}</p>
				</div>

				<table>
					<thead>
						<tr>
							<th>Rank</th>
							<th>Team</th>
							{#each appConfig.event.rating_criteria as criterion}
								<th>{criterion.name}</th>
							{/each}
							<th>Final Grade</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						${rankings
							.map(
								(team, index) => `
							<tr>
								<td class="rank">${index + 1}</td>
								<td class="team">${team.team}</td>
								${appConfig.event.rating_criteria
									.map(
										(c) => `
									<td class="${getRatingColorClass(team[c.key], c.maxScore)}">${team[c.key]?.toFixed(1) || '0.0'}</td>
								`
									)
									.join('')}
								<td class="final-grade ${getRatingColorClass(team.finalGrade, maxTotalScore)}">${team.finalGrade.toFixed(2)}</td>
								<td class="${team.status === 'final' ? 'status-final' : 'status-provisional'}">
									${team.status === 'final' ? 'Final' : 'Provisional'} (${team.ratingCount}/${totalJuries})
								</td>
							</tr>
						`
							)
							.join('')}
					</tbody>
				</table>

				<div class="footer">
					<p>${appConfig.event.name} ${appConfig.event.year} &copy; ${appConfig.event.organizer}</p>
				</div>
			</body>
			</html>
		`;

		
		await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

		// Wait for fonts to load and render properly
		await page.waitForFunction(() => {
			if (document.fonts) {
				return document.fonts.status === 'loaded' || document.fonts.ready;
			}
			return true;
		}, { timeout: 10000 }); // Wait up to 10 seconds for fonts to load

		// Additional wait to ensure fonts are rendered properly
		await page.waitForTimeout(2000);

		
		const pdfBuffer = await page.pdf({
			format: 'A4',
			landscape: true,
			printBackground: true,
			margin: {
				top: '20px',
				right: '20px',
				bottom: '20px',
				left: '20px'
			}
		});

		
		await browser.close();

		
		return new Response(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${appConfig.event.name.toLowerCase().replace(/ /g, '-')}-rankings-${new Date().toISOString().slice(0, 10)}.pdf"`
			}
		});
	} catch (err) {
		console.error('Error generating PDF:', err);
		return json({ error: 'Failed to generate PDF', details: (err as any).message }, { status: 500 });
	}
};

const maxTotalScore = appConfig.event.rating_criteria.reduce((acc, curr) => acc + curr.maxScore, 0);

function getRatingColorClass(score, maxScore = 5) {
	const percentage = (score / maxScore) * 100;
	if (percentage >= 70) return 'good';
	if (percentage >= 50) return 'medium';
	return 'low';
}
