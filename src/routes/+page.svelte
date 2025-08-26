<script lang="ts">
	import '../app.css';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import type { Team } from '$lib/interfaces/Team';
	import UploadFile from '$lib/components/UploadFile.svelte';
	// import Loading from '$lib/Loading.svelte';
	import { page } from '$app/stores';
	let isAuthenticated = $derived($page.data.user?.id);

	let teams: [Team] = [
		{
			teamName: 'neuron',
			rating: 2,
			notes: 'asdfdg'
		}
	];
	import '../app.css';
</script>

<h1 class="text-4xl">
	Welcome

	{#if $page.data.user}
		{$page.data.user?.email.split(' ')[0] ?? 'Something went wrong'}
		<TeamRanking {teams} />
	{:else}
		Guest
	{/if}
</h1>

<nav>
	{#if !isAuthenticated}
		<a href="/login" class="btn">Login</a> |
		<a href="/register" class="btn">Register</a>
	{:else}
		<a href="/protected" class="btn">Protected Page</a> |
		<a href="/upload" class="btn">Upload</a> |
        <!-- HACK: to not let the browser eagerly preload the logout page on hover -->
        <form method="get" action="/logout" style="display:inline">
			<button type="submit" class="btn">Logout</button>
		</form>
	{/if}
</nav>
