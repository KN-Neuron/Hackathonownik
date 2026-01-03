<script>
	import { componentMap } from '$lib/utils/utils';
	export let icon;
	export let text;

	const IconComponent = componentMap[icon];
</script>

<header>
	<span class="icon-container"><svelte:component this={IconComponent} /></span>
	<h1 class="text">{text}</h1>

	<br />
</header>

<style>
	header {
		display: flex;
		flex-direction: row;
		align-items: center;
	}
	h1 {
		font-size: 2rem;
	}
	.icon-container {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		margin-right: 12px;
	}
	.icon-container :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
