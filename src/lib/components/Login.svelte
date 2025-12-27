<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { Button, Input } from '$lib';

	let email = '';
	let password = '';

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
			Don't have email and password? Contact organizers on discord.
		</span>

		<div class="divider mt-8 mb-8">{$page.data.eventConfig.name}</div>

		<Input
			id="email"
			name="email"
			type="email"
			bind:value={email}
			placeholder="Email"
			label="Email"
			required
			{...(error ? { error } : {})}
		/>

		<Input
			id="password"
			name="password"
			type="password"
			bind:value={password}
			placeholder="Password"
			label="Password"
			required
			class="mt-4"
		/>

		<Button type="submit" variant="primary" class="mt-4">Log in</Button>

		<!-- Show error as an alert popup -->
		{#if error}
			<div role="alert" class="alert alert-error mt-4 fade-in">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>{error}</span>
			</div>
		{/if}
	</fieldset>
</form>
