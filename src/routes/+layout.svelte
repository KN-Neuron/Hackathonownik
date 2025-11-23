<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import '../app.css';

	let { children } = $props();
	let open = $state(false);

	
	function closeSidebar() {
		open = false;
	}
</script>

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
		min-height: 100vh;
		position: relative;
	}

	.content-wrapper {
		background-color: black;
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
		width: 100%;
		box-sizing: border-box;
	}

	.desktop-sidebar {
		display: none;
		width: 300px;
		background-color: #1f2937;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 55;
		animation: fadeIn 0.3s ease;
		cursor: pointer;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
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
	}

	/* Additional mobile responsiveness */
	@media (max-width: 768px) {
		.content-wrapper {
			padding: 0.5rem;
		}

		.layout-container {
			flex-direction: column;
		}
	}
</style>
