<script lang="ts">
	import { page } from '$app/stores'
</script>

<article>
	{#if $page.data.user == null}
		<h1>You are signed out.</h1>
		<p>Would you like to <a href="/login">Log in</a> or <a href="/register">Register</a>?</p>
	{:else}
        <p>Something went wrong</p>
	{/if}
</article>

<style>
	h1,
	p {
		text-align: center;
	}
</style>

