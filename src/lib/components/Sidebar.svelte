<script>
	import SidebarElement from '$lib/components/SidebarElement.svelte';
	import { IconNames } from '$lib/utils/utils';

	export let open = false;
</script>

<aside class="absolute w-full h-full bg-gray-800 border-r-2 shadow-lg" class:open>
	<nav class="p-12 text-xl">
		<a class="block" href="#about">
			<SidebarElement icon={IconNames.Home} text="Home" />
		</a>
		<a class="block" href="#contact">Contact</a>
	</nav>
</aside>

<style>
	aside {
		left: -100%;
		transition: left 0.3s ease-in-out;
	}

	.open {
		left: 0;
	}
</style>
