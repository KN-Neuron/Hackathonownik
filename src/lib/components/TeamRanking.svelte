<script lang="ts">
	import { onMount } from 'svelte';
	import JuryRatingDetails from './JuryRatingDetails.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	export let rankings = [];
	export let totalJuries = 0;
	export let categoryFilter = 'all'; 
	const eventConfig = $page.data.eventConfig;

	let sortField = 'finalGrade';
	let sortDirection = 'desc';
	let filterStatus = 'all'; 
	let isPdfExporting = false;
	let jsPDF;
	let jsPDFAutoTable;

	
	onMount(async () => {
		if (browser) {
			const jspdfModule = await import('jspdf');
			const autoTableModule = await import('jspdf-autotable');
			jsPDF = jspdfModule.default;
			jsPDFAutoTable = autoTableModule.default;
		}
	});

	$: sortedRankings = [...rankings]
		.sort((a, b) => {
			const valueA = a[sortField];
			const valueB = b[sortField];
			
			if (typeof valueA === 'string' && typeof valueB === 'string') {
				return sortDirection === 'desc' 
					? valueB.localeCompare(valueA) 
					: valueA.localeCompare(valueB);
			}
			
			return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
		})
		.filter((team) => {
			if (filterStatus === 'all') return true;
			return team.status === filterStatus;
		});

	function sort(field) {
		if (field === sortField) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortField = field;
			sortDirection = 'desc';
		}
	}

	function getScoreColor(score, maxScore = 5) {
		const percentage = (score / maxScore) * 100;
		if (percentage >= 90) return 'text-success font-bold';
		if (percentage >= 70) return 'text-success';
		if (percentage >= 50) return 'text-warning';
		return 'text-error';
	}

	function getStatusClass(status, percent) {
		if (status === 'final') return 'bg-success text-success-content';
		if (percent >= 75) return 'bg-warning text-warning-content';
		return 'bg-neutral text-neutral-content';
	}

	async function fetchTeamRatings(teamId) {
		try {
			const response = await fetch(`/api/ratings/team-details?teamId=${teamId}`);
			if (!response.ok) return [];
			const data = await response.json();
			return data.ratings ?? [];
		} catch {
			return [];
		}
	}

	const maxTotalScore = eventConfig.rating_criteria.reduce((acc, curr) => acc + curr.maxScore, 0);

	async function exportToPdf() {
		try {
			if (!browser || !jsPDF) {
				alert('PDF generation is not available');
				return;
			}

			isPdfExporting = true;

			// Fetch all individual jury ratings for each team
			const teamRatingsMap = new Map();
			await Promise.all(
				sortedRankings.map(async (team) => {
					const ratings = await fetchTeamRatings(team.teamId);
					teamRatingsMap.set(team.teamId, ratings);
				})
			);

			const doc = new jsPDF({
				orientation: 'landscape',
				unit: 'mm',
				format: 'a4'
			});

			// Use helvetica which has better Unicode support
			doc.setFont('helvetica');

			doc.setFontSize(18);
			const category = eventConfig.categories.find(c => c.key === categoryFilter);
			const categoryTitle = category ? `${category.name} Category` : 'All Categories';
			doc.text(`${eventConfig.name} ${eventConfig.year} - Rankings (${categoryTitle})`, 14, 20);

			doc.setFontSize(10);
			doc.setTextColor(100, 100, 100);
			doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
			doc.text(`Total Teams: ${rankings.length} | Total Juries: ${totalJuries}`, 14, 34);

			const tableColumn = [
				'Rank',
				'Team',
				'Category',
				...eventConfig.rating_criteria.map(c => c.name),
				'Final Grade',
				'Status'
			];

			const tableRows = sortedRankings.map((team, index) => [
				index + 1,
				team.team,
				eventConfig.categories.find(c => c.key === team.category)?.name || 'N/A',
				...eventConfig.rating_criteria.map(c => team[c.key]?.toFixed(1) || '0.0'),
				team.finalGrade.toFixed(2),
				`${team.status === 'final' ? 'Final' : 'Provisional'} (${team.ratingCount}/${totalJuries})`
			]);

			jsPDFAutoTable(doc, {
				head: [tableColumn],
				body: tableRows,
				startY: 40,
				styles: { fontSize: 8, cellPadding: 2 },
				headStyles: { fillColor: [59, 130, 246], textColor: 255 },
				alternateRowStyles: { fillColor: [245, 247, 250] },
				columnStyles: {
					0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
					1: { cellWidth: 'auto', fontStyle: 'bold' },
					2: { cellWidth: 20 }
				},
				didDrawCell: (data) => {
					// Final Grade column is at index: 3 (Rank, Team, Category) + criteria length
					const finalGradeIdx = 3 + eventConfig.rating_criteria.length;
					
					if (data.column.index === finalGradeIdx && data.section === 'body') {
						const score = parseFloat(data.cell.text[0]);
						const percentage = (score / maxTotalScore) * 100;
						if (percentage >= 70) doc.setTextColor(54, 195, 153);
						else if (percentage >= 50) doc.setTextColor(247, 166, 84);
						else doc.setTextColor(232, 92, 144);
					}
					// Color the Category column (index 2)
					else if (data.column.index === 2 && data.section === 'body') {
						const categoryName = data.cell.text[0];
						const category = eventConfig.categories.find(c => c.name === categoryName);
						if (category) {
							// Simple hex to RGB conversion for basic colors
							if (category.key === 'wellness') doc.setTextColor(54, 195, 153);
							else if (category.key === 'commerce') doc.setTextColor(247, 166, 84);
						}
					}
					else if (data.section === 'body') {
						doc.setTextColor(0, 0, 0);
					}
				}
			});

			// Add individual jury ratings for each team
			for (const team of sortedRankings) {
				const ratings = teamRatingsMap.get(team.teamId) || [];
				if (ratings.length === 0) continue;

				doc.addPage();

				doc.setFontSize(14);
				doc.setTextColor(0, 0, 0);
				doc.text(`Individual Jury Ratings: ${team.team}`, 14, 20);

				doc.setFontSize(10);
				doc.setTextColor(100, 100, 100);
				doc.text(`Average Final Grade: ${team.finalGrade.toFixed(2)}`, 14, 28);

				const juryColumns = [
					'Jury',
					...eventConfig.rating_criteria.map(c => c.name),
					'Final Grade'
				];

				const juryRows = ratings.map((rating) => [
					rating.juryName,
					...eventConfig.rating_criteria.map(c => rating[c.key]?.toString() || '0'),
					rating.finalGrade.toFixed(2)
				]);

				jsPDFAutoTable(doc, {
					head: [juryColumns],
					body: juryRows,
					startY: 35,
					styles: { fontSize: 8, cellPadding: 2 },
					headStyles: { fillColor: [100, 100, 100], textColor: 255 },
					alternateRowStyles: { fillColor: [245, 247, 250] },
					columnStyles: {
						0: { cellWidth: 'auto', fontStyle: 'bold' }
					},
					didDrawCell: (data) => {
						const lastIdx = 1 + eventConfig.rating_criteria.length;
						if (data.column.index === lastIdx && data.section === 'body') {
							const score = parseFloat(data.cell.text[0]);
							const percentage = (score / maxTotalScore) * 100;
							if (percentage >= 70) doc.setTextColor(54, 195, 153);
							else if (percentage >= 50) doc.setTextColor(247, 166, 84);
							else doc.setTextColor(232, 92, 144);
						} else if (data.section === 'body') {
							doc.setTextColor(0, 0, 0);
						}
					}
				});

				// Add comments section if any jury has comments
				const ratingsWithComments = ratings.filter((r) => r.comments && r.comments.trim());
				if (ratingsWithComments.length > 0) {
					let yPos = doc.lastAutoTable.finalY + 10;

					doc.setFontSize(11);
					doc.setTextColor(0, 0, 0);
					doc.text('Jury Comments:', 14, yPos);
					yPos += 7;

					doc.setFontSize(9);
					for (const rating of ratingsWithComments) {
						// Check if we need a new page
						if (yPos > doc.internal.pageSize.getHeight() - 30) {
							doc.addPage();
							yPos = 20;
						}

						doc.setTextColor(50, 50, 50);
						doc.setFont(undefined, 'bold');
						doc.text(`${rating.juryName}:`, 14, yPos);
						doc.setFont(undefined, 'normal');
						yPos += 5;

						doc.setTextColor(80, 80, 80);
						const lines = doc.splitTextToSize(rating.comments, 260);
						doc.text(lines, 14, yPos);
						yPos += lines.length * 4 + 5;
					}
				}
			}

			const pageCount = doc.internal.getNumberOfPages();
			for (let i = 1; i <= pageCount; i++) {
				doc.setPage(i);
				doc.setFontSize(8);
				doc.setTextColor(150);
				doc.text(
					`${eventConfig.name} ${eventConfig.year} © ${eventConfig.organizer}`,
					doc.internal.pageSize.getWidth() / 2,
					doc.internal.pageSize.getHeight() - 10,
					{
						align: 'center'
					}
				);
				doc.text(
					`Page ${i} of ${pageCount}`,
					doc.internal.pageSize.getWidth() - 20,
					doc.internal.pageSize.getHeight() - 10
				);
			}

			doc.save(`${eventConfig.name.toLowerCase().replace(/ /g, '-')}-rankings-${new Date().toISOString().slice(0, 10)}.pdf`);
		} catch (err) {
			console.error('Error exporting PDF:', err);
			alert('Failed to export PDF. Please try again.');
		} finally {
			isPdfExporting = false;
		}
	}

	async function exportToMarkdown() {
		try {
			const response = await fetch('/api/export/ranking-md');
			if (!response.ok) {
				throw new Error('Failed to export markdown');
			}

			// Create a blob from the response
			const blob = await response.blob();

			// Create a download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${eventConfig.name.toLowerCase().replace(/ /g, '-')}-rankings-${new Date().toISOString().slice(0, 10)}.md`;
			document.body.appendChild(a);
			a.click();

			// Clean up
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error('Error exporting markdown:', err);
			alert('Failed to export markdown. Please try again.');
		}
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Controls -->
	<div class="flex flex-wrap gap-3 justify-between items-center bg-base-200 p-4 rounded-lg mb-2">
		<div class="flex gap-2 items-center">
			<span class="font-medium">Filter:</span>
			<div class="join">
				<button
					class="join-item btn btn-sm {filterStatus === 'all' ? 'btn-active' : ''}"
					on:click={() => (filterStatus = 'all')}>All Teams</button
				>
				<button
					class="join-item btn btn-sm {filterStatus === 'final' ? 'btn-active' : ''}"
					on:click={() => (filterStatus = 'final')}>Final Ratings</button
				>
				<button
					class="join-item btn btn-sm {filterStatus === 'provisional' ? 'btn-active' : ''}"
					on:click={() => (filterStatus = 'provisional')}>Provisional</button
				>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button
				class="btn btn-sm btn-accent {isPdfExporting ? 'loading' : ''}"
				on:click={exportToPdf}
				disabled={isPdfExporting}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="mr-1"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
					<line x1="16" y1="13" x2="8" y2="13"></line>
					<line x1="16" y1="17" x2="8" y2="17"></line>
					<polyline points="10 9 9 9 8 9"></polyline>
				</svg>
				Export as PDF
			</button>

			<button
				class="btn btn-sm btn-outline"
				on:click={exportToMarkdown}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="mr-1"
				>
					<polyline points="4,7 4,4 20,4 20,7"></polyline>
					<polyline points="9,20 9,17 15,17 15,20"></polyline>
					<line x1="12" y1="17" x2="12" y2="4"></line>
					<rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
				</svg>
				Export as Markdown
			</button>

			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">Teams</div>
					<div class="stat-value text-xl">{rankings.length}</div>
				</div>
				<div class="stat">
					<div class="stat-title">Juries</div>
					<div class="stat-value text-xl">{totalJuries}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="overflow-x-auto rounded-box border border-base-content/10 bg-base-100 shadow-lg">
		<table class="table table-zebra">
			<thead>
				<tr class="bg-base-200">
					<th>Rank</th>
					<th class="cursor-pointer" on:click={() => sort('team')}>
						Team {sortField === 'team' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
					</th>
					{#each eventConfig.rating_criteria as criterion}
						<th class="cursor-pointer" on:click={() => sort(criterion.key)}>
							{criterion.name} {sortField === criterion.key ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
						</th>
					{/each}
					<th class="cursor-pointer" on:click={() => sort('finalGrade')}>
						Final Grade {sortField === 'finalGrade' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
					</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedRankings as team, index}
					<tr class="hover:bg-base-200 transition-colors">
						<td class="font-bold">{index + 1}</td>
						<td>
							<div class="team-name-cell">
								<span class="font-semibold">{team.team}</span>
								{#if categoryFilter === 'all' && team.category}
									{@const cat = eventConfig.categories.find(c => c.key === team.category)}
									{#if cat}
										<span class="category-badge" style="background: color-mix(in srgb, {cat.color} 20%, transparent); color: {cat.color}; border: 1px solid color-mix(in srgb, {cat.color} 30%, transparent);">{cat.name}</span>
									{/if}
								{/if}
							</div>
						</td>
						{#each eventConfig.rating_criteria as criterion}
							<td class={getScoreColor(team[criterion.key], criterion.maxScore)}>{team[criterion.key]?.toFixed(1) || '0.0'}</td>
						{/each}
						<td class="font-bold {getScoreColor(team.finalGrade, maxTotalScore)}">
							{team.finalGrade.toFixed(2)}
						</td>
						<td>
							<div class="flex flex-col gap-1">
								<div class="badge {getStatusClass(team.status, team.completionPercent)}">
									{team.status === 'final' ? 'Final' : 'Provisional'}
								</div>
								<div class="w-full h-2 bg-base-300 rounded-full overflow-hidden">
									<div
										class="h-full {getStatusClass(team.status, team.completionPercent)}"
										style="width: {team.completionPercent}%"
									></div>
								</div>
								<span class="text-xs">{team.ratingCount}/{totalJuries} juries</span>
							</div>
						</td>
						<td>
							<JuryRatingDetails teamId={team.teamId} teamName={team.team} />
						</td>
					</tr>
				{/each}

				{#if sortedRankings.length === 0}
					<tr>
						<td colspan={5 + eventConfig.rating_criteria.length} class="text-center py-8 text-base-content/60">
							No teams found matching the selected filter
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Legend -->
	<div class="bg-base-200 p-4 rounded-lg mt-2">
		<h3 class="font-semibold mb-2">Rating Status</h3>
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-2">
				<div class="badge bg-success text-success-content">Final</div>
				<span class="text-sm">Team rated by all juries</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="badge bg-warning text-warning-content">Partial</div>
				<span class="text-sm">Team rated by most juries</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="badge bg-neutral text-neutral-content">Partial</div>
				<span class="text-sm">Team rated by few juries</span>
			</div>
		</div>
	</div>
</div>

<style>
	.btn {
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.btn-active {
		background-color: #3b82f6;
		color: white;
	}

	.btn-sm {
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
	}

	.join {
		display: flex;
	}

	.join-item {
		border-radius: 0;
	}

	.join-item:first-child {
		border-top-left-radius: 0.25rem;
		border-bottom-left-radius: 0.25rem;
	}

	.join-item:last-child {
		border-top-right-radius: 0.25rem;
		border-bottom-right-radius: 0.25rem;
	}

	.stats {
		display: flex;
		background-color: #2c2e33;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.stat {
		padding: 0.75rem 1.5rem;
		text-align: center;
	}

	.stat-title {
		font-size: 0.75rem;
		color: #aaa;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f0f0f0;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th,
	.table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.table th {
		text-align: left;
		font-weight: 500;
		color: #aaa;
	}

	.cursor-pointer {
		cursor: pointer;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.table {
			display: block;
			overflow-x: auto;
			white-space: nowrap;
		}

		.table th,
		.table td {
			min-width: 100px;
			padding: 0.5rem 0.75rem;
		}

		/* Adjust font sizes for smaller screens */
		.stat-value {
			font-size: 1rem;
		}

		.stat-title {
			font-size: 0.65rem;
		}
	}

	@media (max-width: 1024px) {
		.table th,
		.table td {
			padding: 0.5rem;
			font-size: 0.85rem;
		}

		.badge {
			font-size: 0.65rem;
			padding: 0.2rem 0.4rem;
		}
	}

	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		display: inline-block;
		white-space: nowrap;
	}

	.bg-success {
		background-color: #36c399;
	}

	.bg-warning {
		background-color: #f7a654;
	}

	.bg-neutral {
		background-color: #6b7280;
	}

	.text-success {
		color: #36c399;
	}

	.text-warning {
		color: #f7a654;
	}

	.text-error {
		color: #e85c90;
	}

	.font-bold {
		font-weight: 700;
	}

	.btn-accent {
		background: linear-gradient(135deg, #7f7bff, #4df2ff);
		color: #0f1322;
		font-weight: 500;
	}

	.btn-accent:hover {
		background: linear-gradient(135deg, #6a67d6, #3dcede);
	}

	/* Team name with category badge */
	.team-name-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.category-badge {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		text-transform: capitalize;
	}
</style>
