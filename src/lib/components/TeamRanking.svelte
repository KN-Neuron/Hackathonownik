<script lang="ts">
	import type { Rating } from '$lib/types';

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
						col !== 'updated'
				)
			: [];
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
				</tr>
			{:else}
				<tr>
					<td colspan={columns.length + 1}>No ratings available.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
