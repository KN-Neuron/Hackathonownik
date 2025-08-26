<script>
	import Hamburger from '$lib/components/Hamburger.svelte';
	import Logo from '$lib/components/Logo.svelte';

	export let sidebar = false;
</script>

<header class="flex justify-between bg-white p-4 items-center text-gray-600 border-b-2">
	<nav class="flex">
		<div class="hamburger-container">
			<Hamburger bind:open={sidebar} />
		</div>
		<Logo />
	</nav>
</header>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 50;
		background-color: #1D232A;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.hamburger-container {
		position: relative;
		z-index: 80;
	}
</style>
