<script lang="ts">
	import { onMount } from 'svelte';

	let { deadline }: { deadline: string } = $props();

	const deadlineTime = $derived(new Date(deadline).getTime());
	let now = $state(Date.now());

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	let remaining = $derived(deadlineTime - now);

	function format(ms: number) {
		const minutes = Math.floor(ms / 60_000);
		const days = Math.floor(minutes / 1440);
		const hours = Math.floor((minutes % 1440) / 60);
		const mins = minutes % 60;
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${mins}min`;
		return `${mins} min`;
	}
</script>

<div
	class="deadline"
	class:urgent={remaining > 0 && remaining < 3 * 3_600_000}
	class:closed={remaining <= 0}
	title={new Date(deadline).toLocaleString()}
>
	{#if remaining > 0}
		Submissions close in <b>{format(remaining)}</b>
	{:else}
		Submissions are closed
	{/if}
</div>

<style>
	.deadline {
		font-size: 0.8rem;
		padding: 0.35rem 0.6rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.8);
		text-align: center;
	}

	.urgent {
		background: rgba(248, 114, 114, 0.15);
		color: #f87272;
	}

	.closed {
		color: rgba(255, 255, 255, 0.5);
	}
</style>
