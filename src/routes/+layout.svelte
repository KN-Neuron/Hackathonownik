<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import '../app.css';

	let { children } = $props();
	let open = $state(false);
</script>

<Sidebar bind:open />
<Navbar bind:sidebar={open} />

{@render children()}
