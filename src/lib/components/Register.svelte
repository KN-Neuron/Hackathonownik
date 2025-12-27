<script>
	import '../../app.css';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let error = $state('');
</script>

<form method="POST" use:enhance class="flex flex-col gap-4 rounded-box bg-base-200 p-8 max-w-md m-auto">
	<fieldset>
		<h1 class="text-3xl font-bold self-center mb-2">Create an account</h1>

		<span class="self-center text-gray-400 text-sm">
			Already have an account?
			<a class="link link-secondary" href="/login">Log in</a>
		</span>

		<div class="divider my-0 mt-8 mb-8">{$page.data.eventConfig.name}</div>

		<label class="form-control flex flex-col mb-4">
			<div class="label">
				<span class="label-text">Email</span>
			</div>

			<input id="email" name="email" placeholder="Email" class="input input-bordered w-full" />
		</label>

		<label class="form-control flex flex-col mb-4">
			<div class="label">
				<span class="label-text">Password</span>
			</div>

			<input
				type="password"
				id="password"
				name="password"
				class="input input-bordered w-full"
				bind:value={email}
				placeholder="Password"
				required
			/>
		</label>

		<label class="form-control">
			<div class="label">
				<span class="label-text">Confirm password</span>
			</div>

			<input
				type="password"
				id="passwordConfirm"
				name="passwordConfirm"
				class="input input-bordered w-full"
				bind:value={password}
				placeholder="Password"
				required
			/>
		</label>

		<div class="form-control mt-4 mb-4">
			<label class="cursor-pointer label self-start gap-2">
				<input type="checkbox" class="checkbox" />
				<span class="label-text">
					I accept the
					<a class="link link-accent">Terms and Conditions</a>
				</span>
			</label>
		</div>

		<button class="btn btn-primary" type="submit">Create</button>
		{#if error}<div style="color:red">{error}</div>{/if}
	</fieldset>
</form>
