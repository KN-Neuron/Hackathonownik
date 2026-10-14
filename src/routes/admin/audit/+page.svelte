<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data } = $props();
	let onlyProblems = $state(false);
	let entries = $derived(data.entries.filter((e) => !onlyProblems || !e.ok));
	const fmt = (d: string) => new Date(d.replace(' ', 'T')).toLocaleString();
</script>

<div class="page">
	<HeaderText icon={IconNames.Stats} text="Audit log" />
	<p class="text-base-content/70">
		Every decision of the organizers (publishing, people, teams, imports) and every try to unlock
		them, wrong passwords included. Newest first, last {data.entries.length} entries.
	</p>
	<label class="label cursor-pointer gap-2 justify-start">
		<input type="checkbox" class="checkbox checkbox-sm" bind:checked={onlyProblems} />
		<span class="label-text">Only denied and failed attempts</span>
	</label>
	<div class="overflow-x-auto bg-base-200 rounded-lg">
		<table class="table table-sm w-full">
			<thead
				><tr
					><th>When</th><th>Admin</th><th>Action</th><th>Result</th><th>IP</th><th>Details</th></tr
				></thead
			>
			<tbody>
				{#each entries as e (e.id)}
					<tr class={e.ok ? '' : 'text-error'}>
						<td class="whitespace-nowrap">{fmt(e.at)}</td>
						<td>{e.adminEmail || '–'}</td>
						<td class="font-mono text-xs">{e.action}</td>
						<td>{e.ok ? 'ok' : 'denied'}</td>
						<td>{e.ip || '–'}</td>
						<td class="details">{JSON.stringify(e.details)}</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="text-center text-base-content/60">Nothing logged yet</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.page {
		max-width: 1300px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.details {
		max-width: 28rem;
		overflow-wrap: anywhere;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
	}
</style>
