<script lang="ts">
	import type { Team } from '$lib/interfaces/Team';

	let { teams }: { teams: Team[] } = $props();
	teams = teams.sort((a, b) => {
		return b.rating - a.rating;
	});
</script>

<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
	<table class="table">
		<thead>
			<tr>
				<th>Rank</th>
				<th>Team Name</th>
				<th>Rating</th>
				<th>Notes</th>
			</tr>
		</thead>
		<tbody>
			{#each teams as team, rank}
				<tr class="hover:bg-base-300">
					<th>{rank + 1}</th>
					<td>{team.teamName}</td>
					<td>{team.rating}</td>
					<td>{team.notes}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4">No teams available.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	thead {
		border-bottom: 2px solid gray;
	}
	div {
		margin-top: 30px;
		border-radius: 20px;
		min-height: 100%;
	}
</style>
