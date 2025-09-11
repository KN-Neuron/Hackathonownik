<script>
	import SidebarElement from '$lib/components/SidebarElement.svelte';
	import { IconNames } from '$lib/utils/utils';
	import { page } from '$app/stores';

	export let open = false;
</script>

<aside class:open class="bg-base-100">
	<div class="sidebar-header">
		<h2 class="text-2xl font-bold text-primary mb-6">Heroes of the Brain 2025</h2>
	</div>

	<nav class="sidebar-nav">
		<a class="nav-link" href="/" class:active={$page.url.pathname === '/'}>
			<SidebarElement icon={IconNames.Home} text="Home" />
		</a>
		<a class="nav-link" href="/info" class:active={$page.url.pathname === '/info'}>
			<SidebarElement icon={IconNames.Info} text="Info" />
		</a>
		<a class="nav-link" href="/ranking" class:active={$page.url.pathname === '/ranking'}>
			<SidebarElement icon={IconNames.Ranking} text="Ranking" />
		</a>
		<a class="nav-link" href="/upload" class:active={$page.url.pathname === '/upload'}>
			<SidebarElement icon={IconNames.Upload} text="Upload" />
		</a>
	</nav>

	<div class="sidebar-footer">
		<p class="text-sm text-gray-500">© 2025 KN Neuorn</p>
	</div>
</aside>

<style>
	aside {
		height: 100%;
		z-index: 70;
		display: flex;
		flex-direction: column;
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
		padding: 2rem 1.5rem;
		color: white;
	}

	.sidebar-header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
		color: white;
	}

	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-link {
		text-decoration: none;
		color: inherit;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.nav-link.active :global(li) {
		background-color: rgba(59, 130, 246, 0.1);
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.sidebar-footer {
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	@media (max-width: 767px) {
		aside {
			position: fixed;
			top: 0;
			left: -100%;
			width: 100%;
			max-width: 320px;
			transition: left 0.3s ease-in-out;
			padding: 2rem 1rem;
			height: 100vh;
		}

		.open {
			left: 0;
		}
	}
</style>
