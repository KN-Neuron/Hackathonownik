<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';

	let { data } = $props();

	type Team = (typeof data.teams)[number];

	// Team on stage; defaults to the first one in the presentation order
	let index = $state(0);
	$effect(() => {
		const found = data.teams.findIndex((t: Team) => t.teamId === data.onStage?.teamId);
		index = found >= 0 ? found : 0;
	});
	let team = $derived<Team | undefined>(data.teams[index]);
	let onStageHere = $derived(data.onStage?.teamId === team?.teamId);

	// Final stage shows the final presentation when the team uploaded one
	let showFinal = $state(true);
	let fileUrl = $derived(
		team
			? data.stage === 'final' && showFinal && team.finalPresentationUrl
				? team.finalPresentationUrl
				: (team.presentationUrl ?? team.finalPresentationUrl)
			: null
	);

	// Timer: counts down from the stage time, then shows the overtime
	let now = $state(Date.now());
	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(tick);
	});
	let remaining = $derived(
		onStageHere && data.onStage?.startedAt
			? data.onStage.durationSec * 1000 - (now - new Date(data.onStage.startedAt).getTime())
			: data.minutes * 60_000
	);
	let running = $derived(Boolean(onStageHere && data.onStage?.startedAt));
	const format = (ms: number) => {
		const total = Math.ceil(Math.abs(ms) / 1000);
		return `${ms < 0 ? '+' : ''}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
	};

	async function stage(action: 'show' | 'start' | 'reset' | 'clear', teamId?: string) {
		await fetch('/api/stage', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ category: data.category, action, teamId })
		});
		await invalidateAll();
	}

	// Moving to another team puts it on stage for the jury right away
	async function go(to: number) {
		if (to < 0 || to >= data.teams.length) return;
		index = to;
		await stage('show', data.teams[to].teamId);
	}

	let container: HTMLElement | undefined = $state();
	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else container?.requestFullscreen();
	}

	function onKey(event: KeyboardEvent) {
		if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
		if (event.key === 'n') go(index + 1);
		if (event.key === 'p') go(index - 1);
		if (event.key === 's') stage(running ? 'reset' : 'start');
		if (event.key === 'f') toggleFullscreen();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="presenter" bind:this={container}>
	{#if team && fileUrl}
		{#key fileUrl}
			<iframe src="{fileUrl}#toolbar=0&navpanes=0&view=Fit" title="Slides of {team.teamName}"
			></iframe>
		{/key}
	{:else}
		<div class="empty">
			{team ? `${team.teamName} has no presentation uploaded.` : 'No teams to present.'}
		</div>
	{/if}

	<div
		class="timer"
		class:idle={!running}
		class:warning={running && remaining <= 60_000 && remaining > 0}
		class:over={running && remaining <= 0}
	>
		{running && remaining <= 0 ? "Time's up " : ''}{format(remaining)}
	</div>

	<div class="bar">
		<div class="team">
			{#if team}<span class="order">#{team.order}</span> {team.teamName}{/if}
			{#if !onStageHere && team}<span class="hint">(not on stage yet)</span>{/if}
		</div>
		<div class="controls">
			<button class="btn btn-sm" onclick={() => go(index - 1)} disabled={index === 0}
				>← Prev (p)</button
			>
			{#if !onStageHere && team}
				<button class="btn btn-sm btn-warning" onclick={() => stage('show', team!.teamId)}
					>Put on stage</button
				>
			{:else if running}
				<button class="btn btn-sm" onclick={() => stage('reset')}>Reset timer (s)</button>
			{:else}
				<button class="btn btn-sm btn-primary" onclick={() => stage('start')}
					>Start {data.minutes} min timer (s)</button
				>
			{/if}
			<button
				class="btn btn-sm"
				onclick={() => go(index + 1)}
				disabled={index >= data.teams.length - 1}>Next (n) →</button
			>
			{#if data.stage === 'final' && team?.finalPresentationUrl && team?.presentationUrl}
				<button class="btn btn-sm btn-ghost" onclick={() => (showFinal = !showFinal)}>
					{showFinal ? 'Show preliminary PDF' : 'Show final PDF'}
				</button>
			{/if}
			<button class="btn btn-sm btn-ghost" onclick={toggleFullscreen}>Fullscreen (f)</button>
			<button class="btn btn-sm btn-ghost" onclick={() => stage('clear')}>Clear stage</button>
			<a class="btn btn-sm btn-ghost" href="/admin/dashboard?category={data.category}">Exit</a>
		</div>
		<div class="tabs-row">
			<CategoryTabs keys={data.categories} selected={data.category} />
		</div>
	</div>
</div>

<style>
	.presenter {
		position: fixed;
		inset: 0;
		z-index: 3000;
		background: #000;
		display: flex;
		flex-direction: column;
	}

	iframe {
		flex: 1;
		width: 100%;
		border: 0;
		background: #111;
	}

	.empty {
		flex: 1;
		display: grid;
		place-items: center;
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.5rem;
	}

	.timer {
		position: absolute;
		top: 1rem;
		right: 1.25rem;
		padding: 0.4rem 0.9rem;
		border-radius: 0.75rem;
		background: rgba(0, 0, 0, 0.75);
		color: #fff;
		font-size: 2.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.timer.idle {
		opacity: 0.6;
	}

	.timer.warning {
		color: #f7a654;
		border-color: #f7a654;
	}

	.timer.over {
		color: #fff;
		background: #d33;
		border-color: #f87272;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		padding: 0.5rem 1rem;
		background: #111;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.team {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
	}

	.order {
		color: rgba(255, 255, 255, 0.5);
	}

	.hint {
		font-size: 0.8rem;
		font-weight: 400;
		color: #f7a654;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tabs-row {
		margin-left: auto;
	}

	.tabs-row :global(.category-tabs) {
		margin: 0;
	}

	/* In fullscreen only the slides and the timer stay */
	.presenter:fullscreen .bar {
		display: none;
	}
</style>
