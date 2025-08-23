<script>
	import '../../app.css';
	import { pb } from '$lib/pocketbase.svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	let email = '';
	let password = '';
	let error = '';
</script>

<!--
<h2 class="text-4xl">Login</h2>
<form on:submit|preventDefault={handleLogin}>
    <input class="input" type="email" bind:value={email} placeholder="Email" required />
    <input class="input" type="password" bind:value={password} placeholder="Password" required />
    <button class="btn" type="submit">Login</button>
    {#if error}<div style="color:red">{error}</div>{/if}
</form> -->

<form
	method="POST"
	use:enhance
	class="flex flex-col gap-4 rounded-box bg-base-200 p-6 max-w-md content-center"
>
	<fieldset>
		<h1 class="text-3xl font-bold self-center">Log in</h1>

		<span class="self-center">
			Don't have an account?
			<a class="link link-secondary" href="/register">Register</a>
		</span>

		<div class="divider">Heroes of the Brain</div>

		<label class="form-control flex flex-col">
			<div class="label">
				<span class="label-text">Email</span>
			</div>

			<input
				class="input input-bordered w-full"
				id="email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="Email"
				required
			/>
		</label>

		<label class="form-control flex flex-col">
			<div class="label">
				<span class="label-text">Password</span>
				<a class="label-text link link-accent" href="/forgot">Forgot password?</a>
			</div>

			<input
				class="input input-bordered w-full"
				id="password"
				name="password"
				type="password"
				bind:value={password}
				placeholder="Password"
				required
			/>
		</label>

		<div class="form-control">
			<label class="cursor-pointer label self-start gap-2">
				<input type="checkbox" class="checkbox" />
				<span class="label-text">Remember me</span>
			</label>
		</div>

		<button class="btn btn-primary" type="submit">Log in</button>
		{#if error}<div style="color:red">{error}</div>{/if}
	</fieldset>
</form>
