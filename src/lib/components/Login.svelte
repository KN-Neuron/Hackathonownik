<script>
	import '../../app.css';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let email = '';
	let password = '';

	// Subscribe to form data to get error messages from server
	$: error = $page.form?.error || '';
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
			Contact your administrator
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

		<!-- Show error as an alert popup -->
		{#if error}
		<div role="alert" class="alert alert-error mt-4 animate-fade-in">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{error}</span>
		</div>
		{/if}
	</fieldset>
</form>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>
