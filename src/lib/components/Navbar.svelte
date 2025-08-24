<script>
	import Hamburger from '$lib/components/Hamburger.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import Menu from '$lib/components/Menu.svelte';

	export let sidebar = false;
</script>

<header class="flex justify-between bg-gray-200 p-2 items-center text-gray-600 border-b-2">
	<nav class="flex">
		<Hamburger bind:open={sidebar} />
		<Logo />
	</nav>

	<Menu />
</header>
