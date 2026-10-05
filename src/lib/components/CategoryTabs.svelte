<script lang="ts">
	import { page } from '$app/stores';
	import type { EventCategory } from '$lib/types';

	interface Props {
		// Category keys to offer, in config order
		keys: string[];
		selected: string | null;
		// Optional short text per category, e.g. "3/16" or "published"
		badges?: Record<string, string>;
	}

	let { keys, selected, badges = {} }: Props = $props();

	let categories = $derived(
		($page.data.eventConfig.categories as EventCategory[]).filter((c) => keys.includes(c.key))
	);

	// Keep other query parameters, switch only the category
	function hrefFor(key: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('category', key);
		return `?${params}`;
	}
</script>

{#if categories.length > 1}
	<nav class="category-tabs" aria-label="Categories">
		{#each categories as category (category.key)}
			<a
				href={hrefFor(category.key)}
				class="tab"
				class:active={category.key === selected}
				style="--category-color: {category.color}"
				aria-current={category.key === selected ? 'page' : undefined}
				data-sveltekit-noscroll
			>
				<span class="dot"></span>
				{category.name}
				{#if badges[category.key]}
					<span class="badge-text">{badges[category.key]}</span>
				{/if}
			</a>
		{/each}
	</nav>
{:else if categories.length === 1}
	<div class="single-category" style="--category-color: {categories[0].color}">
		<span class="dot"></span>
		{categories[0].name}
	</div>
{/if}

<style>
	.category-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.tab,
	.single-category {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.85rem;
		border-radius: 9999px;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.75);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.15s ease;
	}

	.tab:hover {
		color: #fff;
		border-color: var(--category-color);
	}

	.tab.active,
	.single-category {
		color: var(--category-color);
		background: color-mix(in srgb, var(--category-color) 15%, transparent);
		border-color: color-mix(in srgb, var(--category-color) 50%, transparent);
	}

	.single-category {
		margin-bottom: 1rem;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--category-color);
	}

	.badge-text {
		font-size: 0.7rem;
		font-weight: 500;
		padding: 0.05rem 0.45rem;
		border-radius: 9999px;
		background: rgba(0, 0, 0, 0.3);
		color: rgba(255, 255, 255, 0.8);
	}
</style>
