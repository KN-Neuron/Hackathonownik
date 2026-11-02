<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { Button, Input } from '$lib';

	let email = '';
	let password = '';

	$: error = $page.form?.error || '';
</script>

<form method="POST" use:enhance class="login-card">
	<fieldset>
		<h1>Log in</h1>

		<p class="hint">Don't have email and password? Contact organizers on Discord.</p>

		<div class="fields">
			<Input
				id="email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				label="Email"
				autocomplete="username"
				required
			/>

			<Input
				id="password"
				name="password"
				type="password"
				bind:value={password}
				placeholder="Password"
				label="Password"
				autocomplete="current-password"
				required
			/>
		</div>

		<Button type="submit" variant="primary" fullWidth class="submit">Log in</Button>

		{#if error}
			<div role="alert" class="banner-error">
				<span class="pill pill-error">Could not log in</span>
				<span>{error}</span>
			</div>
		{/if}
	</fieldset>
</form>

<style>
	.login-card {
		max-width: 440px;
		margin: 0 auto;
		padding: 32px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
	}

	h1 {
		margin: 0 0 8px;
	}

	.hint {
		margin: 0 0 24px;
		font-size: 14px;
		color: var(--text-muted);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 24px;
	}

	.banner-error {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		margin-top: 16px;
		padding: 12px 14px;
		border-radius: var(--radius-control);
		border: 1px solid rgba(255, 107, 107, 0.4);
		background: rgba(255, 107, 107, 0.1);
		color: #ffb4b4;
		font-size: 14px;
	}
</style>
