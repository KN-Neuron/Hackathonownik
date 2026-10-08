<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data } = $props();

	let icon = IconNames.Ranking;
	let text = 'Team Rankings';
</script>

<div class="page-content">
	<HeaderText {icon} {text} />
	<div class="mb-4">
		<p class="text-base-content/70">
			Each category is ranked separately by the average score of its jurors. A team is final once
			every juror of its category rated it.
		</p>
	</div>

	<CategoryTabs keys={data.categories} selected={data.category} />

	{#if data.stage === 'preliminary'}
		<p class="stage-note">Preliminary round ranking (presentation and demo video).</p>
	{:else}
		<p class="stage-note">Final ranking of the finalists, out of 25 points.</p>
	{/if}

	{#key data.category}
		<TeamRanking
			rankings={data.rankings}
			totalJuries={data.totalJuries}
			criteria={data.criteria}
			categoryFilter={data.category}
		/>
	{/key}

	{#if data.nonFinalists?.length}
		<p class="stage-note">Did not reach the final: {data.nonFinalists.join(', ')}.</p>
	{/if}
</div>

<style>
	.stage-note {
		margin: 0.5rem 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

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

	.tab-btn.category-active {
		background: color-mix(in srgb, var(--active-color) 20%, transparent);
		border-color: color-mix(in srgb, var(--active-color) 50%, transparent);
		color: var(--active-color);
	}

	.tab-count {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
	}

	.tab-btn.active .tab-count,
	.tab-btn.category-active .tab-count {
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

	.category-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
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
