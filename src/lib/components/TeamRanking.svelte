<script lang="ts">
	import { onMount } from 'svelte';

	export let rankings = [];
	export let totalJuries = 0;

	let sortField = 'finalGrade';
	let sortDirection = 'desc';
	let filterStatus = 'all'; // 'all', 'final', or 'provisional'

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
					</tr>
				{/each}

				{#if sortedRankings.length === 0}
					<tr>
						<td colspan="8" class="text-center py-8 text-base-content/60">
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
</style>
