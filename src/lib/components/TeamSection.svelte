<script lang="ts">
	import TeamCard from './TeamCard.svelte';
	import { page } from '$app/stores';

	let { teams } = $props();
	const eventConfig = $page.data.eventConfig;

	// Group teams by category
	function getTeamsByCategory(categoryKey: string) {
		return teams.filter((t) => t.category === categoryKey);
	}

	const categorizedTeamIds = $derived(new Set(teams.map((t) => t.id)));
	const uncategorizedTeams = $derived(
		teams.filter((t) => !eventConfig.categories.some((c) => c.key === t.category))
	);
</script>

<section class="teams-section">
	<div class="section-header">
		<h2>Project Teams</h2>
		<div class="header-line"></div>
	</div>

	{#each eventConfig.categories as category}
		{@const categoryTeams = getTeamsByCategory(category.key)}
		{#if categoryTeams.length > 0}
			<div class="category-section">
				<div class="category-header" style="border-color: {category.color}">
					<h3 style="color: {category.color}">{category.name}</h3>
					<span class="category-count">{categoryTeams.length} teams</span>
				</div>
				<div class="teams-container">
					{#each categoryTeams as team}
						<TeamCard {team} />
					{/each}
				</div>
			</div>
		{/if}
	{/each}

	<!-- Fallback: Show uncategorized teams -->
	{#if uncategorizedTeams.length > 0}
		<div class="category-section">
			<div class="category-header" style="border-color: #6b7280">
				<h3 style="color: #6b7280">Other / Uncategorized</h3>
				<span class="category-count">{uncategorizedTeams.length} teams</span>
			</div>
			<div class="teams-container">
				{#each uncategorizedTeams as team}
					<TeamCard {team} />
				{/each}
			</div>
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

	.category-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
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
