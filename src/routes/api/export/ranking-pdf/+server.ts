import { json } from '@sveltejs/kit';
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
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
		const page = await browser.newPage();

		
		const htmlContent = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Heroes of the Brain - Rankings</title>
				<style>
					body {
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
						margin: 0;
						padding: 20px;
						color: #333;
					}
					h1 {
						text-align: center;
						margin-bottom: 20px;
						color: #3b82f6;
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
					}
					th, td {
						padding: 10px;
						border: 1px solid #ddd;
						text-align: left;
					}
					th {
						background-color: #f2f2f2;
						font-weight: bold;
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
				<h1>Heroes of the Brain 2025 - Rankings</h1>
				<div class="metadata">
					<p>Generated: ${new Date().toLocaleString()}</p>
					<p>Total Teams: ${rankings.length} | Total Juries: ${totalJuries}</p>
				</div>
				
				<table>
					<thead>
						<tr>
							<th>Rank</th>
							<th>Team</th>
							<th>Innovation</th>
							<th>Usefulness</th>
							<th>Presentation</th>
							<th>Implementation</th>
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
								<td class="${getRatingColorClass(team.innovation)}">${team.innovation.toFixed(1)}</td>
								<td class="${getRatingColorClass(team.usefulness)}">${team.usefulness.toFixed(1)}</td>
								<td class="${getRatingColorClass(team.finalPresentation)}">${team.finalPresentation.toFixed(1)}</td>
								<td class="${getRatingColorClass(team.implementation)}">${team.implementation.toFixed(1)}</td>
								<td class="final-grade ${getRatingColorClass(team.finalGrade)}">${team.finalGrade.toFixed(2)}</td>
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
					<p>Heroes of the Brain 2025 &copy; KN Neuron</p>
				</div>
			</body>
			</html>
		`;

		
		await page.setContent(htmlContent);

		
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
				'Content-Disposition': `attachment; filename="heroes-of-brain-rankings-${new Date().toISOString().slice(0, 10)}.pdf"`
			}
		});
	} catch (err) {
		console.error('Error generating PDF:', err);
		return json({ error: 'Failed to generate PDF', details: err.message }, { status: 500 });
	}
};


function getRatingColorClass(score) {
	if (score >= 4.5) return 'good';
	if (score >= 3.5) return 'good';
	if (score >= 2.5) return 'medium';
	return 'low';
}
