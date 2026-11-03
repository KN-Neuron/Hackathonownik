<script>
	import { IconNames } from '$lib/utils/utils';
	import '../../app.css';
	import Home from '$lib/components/icons/Home.svelte';
	import Info from '$lib/components/icons/Info.svelte';
	import Ranking from '$lib/components/icons/Ranking.svelte';
	import Stats from '$lib/components/icons/Stats.svelte';
	import Upload from '$lib/components/icons/Upload.svelte';
	import Login from '$lib/components/icons/Login.svelte';
	import Register from '$lib/components/icons/Register.svelte';
	import Presentation from '$lib/components/icons/Presentation.svelte';
	import Rate from '$lib/components/icons/Rate.svelte';

	let { icon, text } = $props();
</script>

<li class="menu-item">
	<div class="icon-container">
		{#if icon === IconNames.Home}
			<Home />
		{:else if icon === IconNames.Rate}
			<Rate />
		{:else if icon === IconNames.Ranking}
			<Ranking />
		{:else if icon === IconNames.Stats}
			<Stats />
		{:else if icon === IconNames.Upload}
			<Upload />
		{:else if icon === IconNames.Login}
			<Login />
		{:else if icon === IconNames.Register}
			<Register />
		{:else if icon === IconNames.Info}
			<Info />
		{:else if icon === IconNames.Presentation}
			<Presentation />
		{/if}
	</div>
	<span class="item-text">{text}</span>
</li>

<style>
	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 0 12px;
		border-radius: var(--radius-control);
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 500;
		list-style: none;
		transition: background-color 0.15s ease;
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		flex: none;
		color: currentColor;
	}

	.icon-container :global(svg) {
		width: 100%;
		height: 100%;
		stroke-width: 1.8;
	}

	.item-text {
		color: inherit;
	}
</style>
