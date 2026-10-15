<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { configured, unlockedUntil }: { configured: boolean; unlockedUntil: number | null } =
		$props();

	let password = $state('');
	let error = $state('');
	let busy = $state(false);
	let now = $state(Date.now());

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(tick);
	});

	let minutesLeft = $derived(unlockedUntil ? Math.ceil((unlockedUntil - now) / 60_000) : 0);
	// Counts down in the browser; the server checks the real expiry on every action
	let unlocked = $derived(Boolean(unlockedUntil) && unlockedUntil! > now);

	async function send(method: 'POST' | 'DELETE') {
		busy = true;
		error = '';
		try {
			const res = await fetch('/api/admin/unlock', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: method === 'POST' ? JSON.stringify({ password }) : undefined
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				error = body.error ?? 'Could not unlock.';
				return;
			}
			password = '';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<div class="unlock" class:open={unlocked} role="region" aria-label="Sensitive actions">
	{#if !configured}
		<span>
			🔒 <b>Sensitive actions are disabled</b>: set <code>ADMIN_ACTION_PASSWORD</code> in the server
			environment.
		</span>
	{:else if unlocked}
		<span>🔓 Sensitive actions unlocked for <b>{minutesLeft} min</b>.</span>
		<button class="btn btn-xs btn-outline" onclick={() => send('DELETE')} disabled={busy}
			>Lock now</button
		>
	{:else}
		<span>
			🔒 <b>Sensitive actions are locked.</b> Publishing, people, teams and imports need the admin action
			password.
		</span>
		<form
			class="flex gap-2 items-center"
			onsubmit={(e) => {
				e.preventDefault();
				send('POST');
			}}
		>
			<input
				type="password"
				class="input input-bordered input-xs"
				placeholder="Admin action password"
				autocomplete="off"
				bind:value={password}
				required
			/>
			<button class="btn btn-xs btn-primary" disabled={busy || !password}>Unlock</button>
		</form>
		{#if error}<span class="text-error text-sm">{error}</span>{/if}
	{/if}
</div>

<style>
	.unlock {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		margin-bottom: 1rem;
		padding: 0.6rem 1rem;
		border-radius: 0.75rem;
		background: rgba(247, 166, 84, 0.1);
		border: 1px solid rgba(247, 166, 84, 0.5);
	}

	.unlock.open {
		background: rgba(54, 195, 153, 0.08);
		border-color: rgba(54, 195, 153, 0.4);
	}

	code {
		font-size: 0.85em;
	}
</style>
