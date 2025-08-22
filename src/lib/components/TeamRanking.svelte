<script lang="ts">
	import type { Team } from '$lib/interfaces/Team';

	let { teams }: { teams: Team[] } = $props();
</script>

<div class="overflow-x-auto">
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
				<tr>
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
