<script>
	import '../../app.css';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let error = '';
	async function handleRegister() {
		error = '';
		try {
			await pb.collection('users').create({ email, password, passwordConfirm: password });
			await pb.collection('users').authWithPassword(email, password);
			goto('/');
		} catch (e) {
			error = e.message || 'Register failed';
		}
	}
</script>

<!--   
  <h2 class="text-4xl">Register</h2>
  <form on:submit|preventDefault={handleRegister}>
    <input class="input" type="email" bind:value={email} placeholder="Email" required />
    <input class="input" type="password" bind:value={password} placeholder="Password" required />
    <button class="btn" type="submit">Register</button>
    {#if error}<div style="color:red">{error}</div>{/if} -->

<form
	class="flex flex-col gap-4 rounded-box bg-base-200 p-6 max-w-md"
	on:submit|preventDefault={handleRegister}
>
	<h1 class="text-3xl font-bold self-center">Create an account</h1>

	<span class="self-center">
		Already have an account?
		<a class="link link-secondary" href="/login">Log in</a>
	</span>
	<!-- 
	<a class="btn btn-neutral">
		<i class="fa-brands fa-google text-primary"></i>
		Create with Google
	</a> -->

	<div class="divider my-0">OR</div>

	<label class="form-control flex flex-col">
		<div class="label">
			<span class="label-text">Email</span>
		</div>

		<input class="input input-bordered w-full" />
	</label>

	<label class="form-control flex flex-col">
		<div class="label">
			<span class="label-text">Password</span>
		</div>

		<input
			type="password"
			class="input input-bordered w-full"
			bind:value={email}
			placeholder="Email"
			required
		/>
	</label>

	<label class="form-control">
		<div class="label">
			<span class="label-text">Confirm password</span>
		</div>

		<input
			type="password"
			class="input input-bordered w-full"
			bind:value={password}
			placeholder="Password"
			required
		/>
	</label>

	<div class="form-control">
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
</form>
