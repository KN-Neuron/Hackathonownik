<script lang="ts">
	import '../app.css';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import Loading from '$lib/Loading.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import type { Team } from '$lib/interfaces/Team';
	import UploadFile from '$lib/components/UploadFile.svelte';
	let user = null;
	let loading = true;

	onMount(async () => {
		user = pb.authStore.model;
		loading = false;
	});

	function logout() {
		pb.authStore.clear();
		user = null;
	}

	let teams: [Team] = [
		{
			teamName: 'neuron',
			rating: 2,
			notes: 'asdfdg'
		}
	];
</script>

<h1 class="text-4xl">
	Welcome
	<UploadFile />
	{#if loading}
		<Loading />
	{:else if user}
		{user.email}
		<TeamRanking {teams} />
	{:else}
		Guest
	{/if}
</h1>

<nav>
	{#if loading}
		<!-- <Loading /> -->
		<a href="/login" class="btn">Login</a> |
		<a href="/register" class="btn">Register</a>
	{:else if !user}
		<a href="/login" class="btn">Login</a> |
		<a href="/register" class="btn">Register</a>
	{:else}
		<a href="/protected" class="btn">Protected Page</a> |
		<button on:click={logout} class="btn">Logout</button>
	{/if}
</nav>
