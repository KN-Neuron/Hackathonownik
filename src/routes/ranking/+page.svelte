<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import { IconNames } from '$lib/utils/utils';

	export let data;

	const { rankings, totalJuries } = data;

	let icon = IconNames.Ranking;
	let text = 'Team Rankings';

	// Filter rankings by category
	$: wellnessRankings = rankings.filter(r => r.category === 'wellness');
	$: commerceRankings = rankings.filter(r => r.category === 'commerce');

	// Active tab for viewing
	let activeTab = 'all';
</script>

<div class="page-content">
	<HeaderText {icon} {text} />
	<div class="mb-4">
		<p class="text-base-content/70">
			View all team ratings and their completion status. Teams with ratings from all juries are
			marked as final.
		</p>
	</div>

	<!-- Category Tabs -->
	<div class="category-tabs">
		<button
			class="tab-btn"
			class:active={activeTab === 'all'}
			on:click={() => activeTab = 'all'}
		>
			All Teams
			<span class="tab-count">{rankings.length}</span>
		</button>
		<button
			class="tab-btn wellness-tab"
			class:active={activeTab === 'wellness'}
			on:click={() => activeTab = 'wellness'}
		>
			Wellness
			<span class="tab-count">{wellnessRankings.length}</span>
		</button>
		<button
			class="tab-btn commerce-tab"
			class:active={activeTab === 'commerce'}
			on:click={() => activeTab = 'commerce'}
		>
			Commerce
			<span class="tab-count">{commerceRankings.length}</span>
		</button>
	</div>

	<!-- Rankings Content -->
	{#if activeTab === 'all'}
		<TeamRanking {rankings} {totalJuries} categoryFilter="all" />
	{:else if activeTab === 'wellness'}
		<div class="category-ranking-section">
			<div class="category-indicator wellness">
				<span class="category-dot"></span>
				<span>Wellness Category Rankings</span>
			</div>
			<TeamRanking rankings={wellnessRankings} {totalJuries} categoryFilter="wellness" />
		</div>
	{:else if activeTab === 'commerce'}
		<div class="category-ranking-section">
			<div class="category-indicator commerce">
				<span class="category-dot"></span>
				<span>Commerce Category Rankings</span>
			</div>
			<TeamRanking rankings={commerceRankings} {totalJuries} categoryFilter="commerce" />
		</div>
	{/if}
</div>

<style>
	.page-content {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	/* Category Tabs */
	.category-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	.tab-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.tab-btn.active {
		background: rgba(127, 123, 255, 0.2);
		border-color: rgba(127, 123, 255, 0.5);
		color: #fff;
	}

	.tab-btn.wellness-tab.active {
		background: rgba(54, 195, 153, 0.2);
		border-color: rgba(54, 195, 153, 0.5);
		color: #36c399;
	}

	.tab-btn.commerce-tab.active {
		background: rgba(247, 166, 84, 0.2);
		border-color: rgba(247, 166, 84, 0.5);
		color: #f7a654;
	}

	.tab-count {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
	}

	.tab-btn.active .tab-count {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Category Indicator */
	.category-ranking-section {
		margin-top: 0.5rem;
	}

	.category-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.category-indicator.wellness {
		color: #36c399;
	}

	.category-indicator.commerce {
		color: #f7a654;
	}

	.category-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.category-indicator.wellness .category-dot {
		background: #36c399;
	}

	.category-indicator.commerce .category-dot {
		background: #f7a654;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.category-tabs {
			flex-direction: column;
		}

		.tab-btn {
			width: 100%;
			justify-content: center;
		}

		.flex.flex-col.gap-4 {
			gap: 1rem;
		}

		.bg-base-200.p-4.rounded-lg.mb-2 {
			padding: 0.5rem;
			flex-direction: column;
			gap: 0.5rem;
		}

		.stats {
			width: 100%;
		}
	}
</style>
