<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import '../app.css';

	let { children, data } = $props();
	let open = $state(false);

	function closeSidebar() {
		open = false;
	}
</script>

<svelte:head>
	<title>{data.eventConfig.name} {data.eventConfig.year}</title>
</svelte:head>

<div class="layout-container">
	<div class="desktop-sidebar">
		<Sidebar />
	</div>

	<div class="content-container">
		<div class="mobile-only">
			<Navbar bind:sidebar={open} />
		</div>

		{#if open}
			<div class="sidebar-overlay" on:click={closeSidebar}></div>
		{/if}

		<div class="mobile-sidebar">
			<Sidebar bind:open />
		</div>

		<main class="content-wrapper">
			{@render children()}
		</main>

		<Footer />
	</div>
</div>

<style>
	.layout-container {
		display: flex;
		min-height: 100vh;
		width: 100%;
	}

	.content-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		/* Let the content shrink next to the sidebar instead of pushing the page wider */
		min-width: 0;
		flex: 1;
		min-height: 100vh;
		position: relative;
	}

	.content-wrapper {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		width: 100%;
		box-sizing: border-box;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
	}

	.desktop-sidebar {
		display: none;
		width: 260px;
		flex-shrink: 0;
	}

	.mobile-sidebar {
		display: block;
		flex-shrink: 0;
	}

	.mobile-only {
		display: block;
		position: relative;
		z-index: 70;
		width: 100%;
	}

	.sidebar-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 55;
		cursor: pointer;
	}

	@media (min-width: 1024px) {
		.desktop-sidebar {
			display: block;
		}

		.mobile-sidebar {
			display: none;
		}

		.mobile-only {
			display: none;
		}

		.content-wrapper {
			padding: 40px 48px;
		}
	}

	@media (max-width: 768px) {
		.layout-container {
			flex-direction: column;
		}
	}
</style>
