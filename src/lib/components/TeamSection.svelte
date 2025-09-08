<script lang="ts">
	import TeamCard from './TeamCard.svelte';

	let { teams } = $props();
</script>

<section class="teams-section">
	<div class="section-header">
		<h2>Project Teams</h2>
		<div class="header-line"></div>
	</div>

	<div class="teams-container">
		{#each teams as team}
			<TeamCard {team} />
		{/each}
	</div>
</section>

<style>
	.teams-section {
		padding: 24px 0;
		width: 100%;
	}

	.section-header {
		margin-bottom: 24px;
		position: relative;
	}

	h2 {
		color: #f0f0f0;
		font-size: 24px;
		font-weight: 600;
		margin: 0 0 16px 0;
		letter-spacing: 0.5px;
	}

	.header-line {
		height: 3px;
		width: 60px;
		background: linear-gradient(90deg, #543bad 0%, #36c399 100%);
		border-radius: 2px;
	}

	.teams-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>
