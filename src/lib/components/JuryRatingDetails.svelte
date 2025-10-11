<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';

	export let teamId: string;
	export let teamName: string;

	let ratings = [];
	let loading = true;
	let error = '';
	let showModal = false;

	onMount(async () => {
		await loadRatings();
	});

	async function loadRatings() {
		try {
			loading = true;
			const response = await fetch(`/api/ratings/team-details?teamId=${teamId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch rating details');
			}

			const data = await response.json();
			ratings = data.ratings || [];
		} catch (err) {
			console.error('Error fetching rating details:', err);
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function getRatingColor(value) {
		if (value >= 4.5) return 'text-success font-bold';
		if (value >= 3.5) return 'text-success';
		if (value >= 2.5) return 'text-warning';
		return 'text-error';
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
</script>

<div class="jury-ratings-details">
	<button class="btn btn-sm btn-secondary" on:click={() => (showModal = true)}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
			<circle cx="12" cy="12" r="3"></circle>
		</svg>
		View Jury Ratings
	</button>

	<Modal bind:show={showModal} wide={true}>
		{#snippet header()}
			<h3 class="text-xl font-bold">
				Jury Ratings for {teamName}
			</h3>
		{/snippet}

		{#if loading}
			<div class="flex justify-center py-8">
				<div class="loading loading-spinner loading-lg"></div>
			</div>
		{:else if error}
			<div class="alert alert-error">{error}</div>
		{:else if ratings.length === 0}
			<div class="text-center py-8 text-gray-400">No ratings available for this team.</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>Jury</th>
							<th>Innovation</th>
							<th>Usefulness</th>
							<th>Presentation</th>
							<th>Implementation</th>
							<th>Final Grade</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each ratings as rating}
							<tr class="hover:bg-base-200">
								<td>{rating.juryName}</td>
								<td class={getRatingColor(rating.innovation)}>{rating.innovation}</td>
								<td class={getRatingColor(rating.usefulness)}>{rating.usefulness}</td>
								<td class={getRatingColor(rating.finalPresentation)}>{rating.finalPresentation}</td>
								<td class={getRatingColor(rating.implementation)}>{rating.implementation}</td>
								<td class="font-bold {getRatingColor(rating.finalGrade)}"
									>{rating.finalGrade.toFixed(2)}</td
								>
								<td class="text-xs whitespace-nowrap">{formatDate(rating.created)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="mt-6 pt-4 border-t border-base-300">
				<h4 class="font-medium mb-2">Jury Comments:</h4>
				<div class="space-y-4">
					{#each ratings.filter((r) => r.comments && r.comments.trim()) as rating}
						<div class="bg-base-300 p-3 rounded">
							<div class="font-medium mb-1 flex justify-between">
								<span>{rating.juryName}</span>
								<span class="text-xs opacity-70">{formatDate(rating.created)}</span>
							</div>
							<p class="whitespace-pre-wrap text-sm">{rating.comments}</p>
						</div>
					{:else}
						<p class="text-gray-400 text-sm italic">No comments from jury members</p>
					{/each}
				</div>
			</div>
		{/if}
	</Modal>
</div>
