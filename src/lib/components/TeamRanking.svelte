<script lang="ts">
	import { onMount } from 'svelte';
	import JuryRatingDetails from './JuryRatingDetails.svelte';
	import { browser } from '$app/environment';

	export let rankings = [];
	export let totalJuries = 0;

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

	function getScoreColor(score) {
		if (score >= 4.5) return 'text-success font-bold';
		if (score >= 3.5) return 'text-success';
		if (score >= 2.5) return 'text-warning';
		return 'text-error';
	}

	function getStatusClass(status, percent) {
		if (status === 'final') return 'bg-success text-success-content';
		if (percent >= 75) return 'bg-warning text-warning-content';
		return 'bg-neutral text-neutral-content';
	}

	async function exportToPdf() {
		try {
			if (!browser || !jsPDF) {
				alert('PDF generation is not available');
				return;
			}

			isPdfExporting = true;

			
			const doc = new jsPDF({
				orientation: 'landscape',
				unit: 'mm',
				format: 'a4'
			});

			
			doc.setFontSize(18);
			doc.text('Heroes of the Brain 2025 - Rankings', 14, 20);

			
			doc.setFontSize(10);
			doc.setTextColor(100, 100, 100);
			doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
			doc.text(`Total Teams: ${rankings.length} | Total Juries: ${totalJuries}`, 14, 34);

			
			const tableColumn = [
				'Rank',
				'Team',
				'Innovation',
				'Usefulness',
				'Presentation',
				'Implementation',
				'Final Grade',
				'Status'
			];

			
			const tableRows = sortedRankings.map((team, index) => [
				index + 1,
				team.team,
				team.innovation.toFixed(1),
				team.usefulness.toFixed(1),
				team.finalPresentation.toFixed(1),
				team.implementation.toFixed(1),
				team.finalGrade.toFixed(2),
				`${team.status === 'final' ? 'Final' : 'Provisional'} (${team.ratingCount}/${totalJuries})`
			]);

			
			jsPDFAutoTable(doc, {
				head: [tableColumn],
				body: tableRows,
				startY: 40,
				styles: { fontSize: 9, cellPadding: 3 },
				headStyles: { fillColor: [59, 130, 246], textColor: 255 },
				alternateRowStyles: { fillColor: [245, 247, 250] },
				columnStyles: {
					0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
					1: { cellWidth: 'auto', fontStyle: 'bold' },
					6: { cellWidth: 25, fontStyle: 'bold' },
					7: { cellWidth: 35 }
				},
				didDrawCell: (data) => {
					
					if (data.column.index === 6 && data.section === 'body') {
						const score = parseFloat(data.cell.text[0]);
						if (score >= 4.5) doc.setTextColor(54, 195, 153);
						else if (score >= 3.5) doc.setTextColor(54, 195, 153);
						else if (score >= 2.5) doc.setTextColor(247, 166, 84);
						else doc.setTextColor(232, 92, 144);
					} else if (data.section === 'body') {
						
						doc.setTextColor(0, 0, 0);
					}
				}
			});

			
			const pageCount = doc.internal.getNumberOfPages();
			for (let i = 1; i <= pageCount; i++) {
				doc.setPage(i);
				doc.setFontSize(8);
				doc.setTextColor(150);
				doc.text(
					'Heroes of the Brain 2025 © KN Neuron',
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

			
			doc.save(`heroes-of-brain-rankings-${new Date().toISOString().slice(0, 10)}.pdf`);
		} catch (err) {
			console.error('Error exporting PDF:', err);
			alert('Failed to export PDF. Please try again.');
		} finally {
			isPdfExporting = false;
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
					<th class="cursor-pointer" on:click={() => sort('innovation')}>
						Innovation {sortField === 'innovation' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
					</th>
					<th class="cursor-pointer" on:click={() => sort('usefulness')}>
						Usefulness {sortField === 'usefulness' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
					</th>
					<th class="cursor-pointer" on:click={() => sort('finalPresentation')}>
						Presentation {sortField === 'finalPresentation'
							? sortDirection === 'desc'
								? '↓'
								: '↑'
							: ''}
					</th>
					<th class="cursor-pointer" on:click={() => sort('implementation')}>
						Implementation {sortField === 'implementation'
							? sortDirection === 'desc'
								? '↓'
								: '↑'
							: ''}
					</th>
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
							<div class="font-semibold">{team.team}</div>
						</td>
						<td class={getScoreColor(team.innovation)}>{team.innovation.toFixed(1)}</td>
						<td class={getScoreColor(team.usefulness)}>{team.usefulness.toFixed(1)}</td>
						<td class={getScoreColor(team.finalPresentation)}
							>{team.finalPresentation.toFixed(1)}</td
						>
						<td class={getScoreColor(team.implementation)}>{team.implementation.toFixed(1)}</td>
						<td class="font-bold {getScoreColor(team.finalGrade)}">
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
						<td colspan="9" class="text-center py-8 text-base-content/60">
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
</style>
