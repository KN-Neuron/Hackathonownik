<script>
	import '../../app.css';
	import { enhance } from '$app/forms';

	let email = '';
	let password = '';
	let error = '';
</script>

<form
	method="POST"
	use:enhance
	class="flex flex-col gap-4 rounded-box bg-base-200 p-8 max-w-md content-center m-auto"
>
	<fieldset>
		<h1 class="text-3xl font-bold self-center mb-2">Log in</h1>

		<span class="self-center text-gray-400 text-sm">
			Don't have an account?
			<a class="link link-secondary" href="/register">Register</a>
		</span>

		<div class="divider mt-8 mb-8">Heroes of the Brain</div>

		<label class="form-control flex flex-col mb-4">
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

		<label class="form-control flex flex-col mb-4">
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

		<div class="form-control mb-4">
			<label class="cursor-pointer label self-start gap-2">
				<input type="checkbox" class="checkbox" />
				<span class="label-text">Remember me</span>
			</label>
		</div>

		<button class="btn btn-primary" type="submit">Log in</button>
		{#if error}<div style="color:red">{error}</div>{/if}
	</fieldset>
</form>
