<script lang="ts">
	import TeamCard from './TeamCard.svelte';
	import { page } from '$app/stores';

	let { teams, locked = false } = $props();
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
				<div class="category-header">
					<h3 style="color: {category.color}">{category.name}</h3>
					<span class="category-count">{categoryTeams.length} teams</span>
				</div>
				<div class="teams-container">
					{#each categoryTeams as team (team.id)}
						<TeamCard {team} {locked} />
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
				{#each uncategorizedTeams as team (team.id)}
					<TeamCard {team} {locked} />
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
		color: #fff;
		font-size: 20px;
		font-weight: 700;
		margin: 0 0 16px 0;
	}

	.header-line {
		display: none;
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
		border-bottom: 1px solid var(--line);
	}

	.category-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.category-count {
		font-size: 0.875rem;
		color: var(--text-muted);
		padding: 0 10px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
	}

	.teams-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>
