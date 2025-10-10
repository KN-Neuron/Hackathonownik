<script lang="ts">
	import Modal from './Modal.svelte';
	import { onMount } from 'svelte';

	export let teamId;
	let ratings = [];
	let loading = true;
	let error = '';
	let showModal = false;
	let selectedRating = null;

	onMount(async () => {
		try {
			// Fetch all ratings for this team
			const response = await fetch(`/api/ratings/history?teamId=${teamId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch rating history');
			}

			const data = await response.json();
			ratings = data.ratings || [];
		} catch (err) {
			console.error('Error fetching rating history:', err);
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	});

	function viewRatingDetails(rating) {
		selectedRating = rating;
		showModal = true;
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getRatingColor(value) {
		if (value >= 4) return 'text-success';
		if (value >= 3) return 'text-warning';
		if (value >= 2) return 'text-error';
		return 'text-gray-400';
	}
</script>

<div class="rating-history">
	<h3 class="text-lg font-semibold mb-3">Rating History</h3>

	{#if loading}
		<div class="flex justify-center py-4">
			<span class="loading loading-spinner loading-md"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
	{:else if ratings.length === 0}
		<div class="text-center py-4 text-gray-500">No ratings yet for this team.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-compact w-full">
				<thead>
					<tr>
						<th>Jury</th>
						<th>Grade</th>
						<th>Date</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each ratings as rating}
						<tr class="hover:bg-base-200 cursor-pointer" on:click={() => viewRatingDetails(rating)}>
							<td>{rating.juryName}</td>
							<td class={getRatingColor(rating.finalGrade)}>{rating.finalGrade.toFixed(1)}</td>
							<td>{formatDate(rating.created)}</td>
							<td>
								<button class="btn btn-xs btn-ghost">View</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<Modal bind:show={showModal}>
		{#snippet header()}
			<h3 class="text-xl font-bold">Rating Details</h3>
		{/snippet}

		{#if selectedRating}
			<div class="space-y-4">
				<div class="flex justify-between">
					<span class="font-medium">Jury:</span>
					<span>{selectedRating.juryName}</span>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="font-medium">Innovation:</span>
						<span class={getRatingColor(selectedRating.innovation)}
							>{selectedRating.innovation}</span
						>
					</div>
					<div>
						<span class="font-medium">Usefulness:</span>
						<span class={getRatingColor(selectedRating.usefulness)}
							>{selectedRating.usefulness}</span
						>
					</div>
					<div>
						<span class="font-medium">Presentation:</span>
						<span class={getRatingColor(selectedRating.finalPresentation)}
							>{selectedRating.finalPresentation}</span
						>
					</div>
					<div>
						<span class="font-medium">Implementation:</span>
						<span class={getRatingColor(selectedRating.implementation)}
							>{selectedRating.implementation}</span
						>
					</div>
				</div>

				<div>
					<span class="font-medium">Final Grade:</span>
					<span class={getRatingColor(selectedRating.finalGrade)}
						>{selectedRating.finalGrade.toFixed(1)}</span
					>
				</div>

				{#if selectedRating.comments}
					<div>
						<span class="font-medium block mb-1">Comments:</span>
						<p class="bg-base-200 p-3 rounded-box text-sm">{selectedRating.comments}</p>
					</div>
				{/if}

				<div class="text-right text-sm text-gray-500">
					{formatDate(selectedRating.created)}
				</div>
			</div>
		{/if}
	</Modal>
</div>

<style>
	.rating-history {
		background-color: #1e1f22;
		border-radius: 8px;
		padding: 16px;
		margin-top: 16px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
		border: 1px solid #2c2e33;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid #2c2e33;
		color: #aaa;
		font-size: 14px;
		font-weight: normal;
	}

	.table td {
		padding: 8px 12px;
		border-bottom: 1px solid #2c2e33;
		font-size: 14px;
	}

	.table tr:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.btn-ghost {
		background: none;
		border: none;
		padding: 4px 8px;
		color: #aaa;
		font-size: 12px;
	}

	.btn-ghost:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
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

	.loading {
		display: inline-block;
		width: 28px;
		height: 28px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border-top-color: #3b82f6;
		animation: spin 1s ease-in-out infinite;
	}
</style>
