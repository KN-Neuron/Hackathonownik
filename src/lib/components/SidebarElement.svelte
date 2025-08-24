<script>
	import { IconNames } from '$lib/utils/utils';
	import '../../app.css';
	import Home from '$lib/components/icons/Home.svelte';
	import Info from '$lib/components/icons/Info.svelte';
	import Stats from '$lib/components/icons/Stats.svelte';

	let { icon, text } = $props();
</script>

<div class="border-2 border-stone-400 flex flex-row align-left gap-1">
	{#if icon === IconNames.Home}
		<span> <Home /> </span>
	{:else if icon === IconNames.Info}
		<Info />
	{:else if icon === IconNames.Stats}
		<Stats />
	{/if}
	<span> {text} </span>
</div>
