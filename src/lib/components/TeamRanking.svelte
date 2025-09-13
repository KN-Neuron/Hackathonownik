<script lang="ts">
	import type { Rating } from '$lib/types';
	import Modal from './Modal.svelte';

	const { ratings }: { ratings: Rating[] } = $props();

	const columns =
		ratings && ratings.length > 0
			? Object.keys(ratings[0]).filter(
					(col) =>
						col !== 'id' &&
						col !== 'created' &&
						col !== 'updated' &&
						col !== 'collectionId' &&
						col !== 'collectionName' &&
						col !== 'id' &&
						col !== 'updated' &&
						col !== 'comments'
				)
			: [];

	let showModal = $state(false);
	async function showModalHandler() {
		showModal = true;
	}
</script>

<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
	<table class="table">
		<thead>
			<tr>
				<th>Place</th>
				{#each columns as col}
					<th>{col.charAt(0).toUpperCase() + col.slice(1)}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each ratings as rating, rank}
				<tr class="hover:bg-base-300">
					<th>{rank + 1}</th>
					{#each columns as col}
						<td>{rating[col] ?? 'N/A'}</td>
					{/each}
					<td on:click={() => showModalHandler()}>
						<p class="ellipsis-text">{rating.comments}</p>

						<Modal bind:show={showModal}>
							<div>
								{rating.comments}
							</div>
						</Modal>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan={columns.length + 1}>No ratings available.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.ellipsis-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px; /* Adjust as needed */
	}
</style>
