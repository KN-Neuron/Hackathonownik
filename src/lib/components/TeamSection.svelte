<script lang="ts">
	import TeamCard from './TeamCard.svelte';

	let { teams } = $props();

	// Group teams by category
	let wellnessTeams = $derived(teams.filter(t => t.category === 'wellness'));
	let commerceTeams = $derived(teams.filter(t => t.category === 'commerce'));
</script>

<section class="teams-section">
	<div class="section-header">
		<h2>Project Teams</h2>
		<div class="header-line"></div>
	</div>

	<!-- Wellness Category -->
	{#if wellnessTeams.length > 0}
		<div class="category-section">
			<div class="category-header wellness">
				<h3>Wellness</h3>
				<span class="category-count">{wellnessTeams.length} teams</span>
			</div>
			<div class="teams-container">
				{#each wellnessTeams as team}
					<TeamCard {team} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Commerce Category -->
	{#if commerceTeams.length > 0}
		<div class="category-section">
			<div class="category-header commerce">
				<h3>Commerce</h3>
				<span class="category-count">{commerceTeams.length} teams</span>
			</div>
			<div class="teams-container">
				{#each commerceTeams as team}
					<TeamCard {team} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Fallback: Show all teams if no category is set -->
	{#if wellnessTeams.length === 0 && commerceTeams.length === 0 && teams.length > 0}
		<div class="teams-container">
			{#each teams as team}
				<TeamCard {team} />
			{/each}
		</div>
	{/if}
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

	/* Category sections */
	.category-section {
		margin-bottom: 2rem;
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid;
	}

	.category-header.wellness {
		border-color: #36c399;
	}

	.category-header.commerce {
		border-color: #f7a654;
	}

	.category-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.category-header.wellness h3 {
		color: #36c399;
	}

	.category-header.commerce h3 {
		color: #f7a654;
	}

	.category-count {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
	}

	.teams-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>
