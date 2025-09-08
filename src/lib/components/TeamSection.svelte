<script lang="ts">
	import TeamCard from './TeamCard.svelte';

	let { teams } = $props();
</script>

<section class="teams-section">
	<h1>Project Teams</h1>
	<div class="teams-container">
		{#each teams as team}
			<TeamCard {team} />
		{/each}
	</div>
</section>

<style>
	.teams-section {
		padding: 20px;
		max-width: 1000px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2rem;
		color: #ffffff;
		margin-bottom: 24px;
		font-weight: 600;
		padding-bottom: 10px;
		border-bottom: 1px solid #3a3d43;
	}

	.teams-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.teams-section {
			padding: 12px;
		}

		h1 {
			font-size: 1.6rem;
		}
	}
</style>
