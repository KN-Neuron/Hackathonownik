<script>
	import { IconNames } from '$lib/utils/utils';
	import '../../app.css';
	import Home from '$lib/components/icons/Home.svelte';
	import Info from '$lib/components/icons/Info.svelte';
	import Ranking from '$lib/components/icons/Ranking.svelte';
	import Upload from '$lib/components/icons/Upload.svelte';
	import Login from '$lib/components/icons/Login.svelte';
	import Register from '$lib/components/icons/Register.svelte';

	let { icon, text } = $props();
</script>

<li class="menu-item">
	<div class="icon-container">
		{#if icon === IconNames.Home}
			<Home />
		{:else if icon === IconNames.Info}
			<Info />
		{:else if icon === IconNames.Ranking}
			<Ranking />
		{:else if icon === IconNames.Upload}
			<Upload />
		{:else if icon === IconNames.Login}
			<Login />
		{:else if icon === IconNames.Register}
			<Register />
		{/if}
	</div>
	<span class="item-text">{text}</span>
</li>

<style>
	.menu-item {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		cursor: pointer;
		margin-bottom: 0.5rem;
		color: #1f2937;
	}

	.menu-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: #4b5563;
	}

	.icon-container :global(svg) {
		width: 100%;
		height: 100%;
	}

	.item-text {
		margin-left: 0.75rem;
		font-weight: 500;
		font-size: 1rem;
		color: white;
	}
</style>
