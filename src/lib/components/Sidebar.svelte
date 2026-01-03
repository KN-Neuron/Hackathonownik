<script>
	import SidebarElement from '$lib/components/SidebarElement.svelte';
	import { IconNames } from '$lib/utils/utils';
	import { page } from '$app/stores';

	let user = $derived($page.data.user);
	let isAuthenticated = $derived($page.data.user?.id);
	let teamCategory = $derived($page.data.teamCategory);

	let isParticipant = $derived(
		user &&
			!user.admin &&
			user.role !== 'admin' &&
			user.role !== 'jury' &&
			(user.role === 'participant' || user.team)
	);

	const { open = false } = $props();
	const eventConfig = $page.data.eventConfig;
	const category = $derived(eventConfig.categories.find((c) => c.key === teamCategory));
</script>

<aside class:open class="bg-base-100">
	<div class="sidebar-header">
		<a href="/"
			><h2 class="text-2xl font-bold text-primary mb-6 text-center">{$page.data.eventConfig.name} {$page.data.eventConfig.year}</h2></a
		>
		{#if isAuthenticated}
			<div class="user-info-sidebar">
				<span class="user-name-sidebar">{user.name || user.email}</span>
				<span
					class="user-role-sidebar"
					class:admin={user.admin || user.role === 'admin'}
					class:jury={user.role === 'jury'}
				>
					{user.admin || user.role === 'admin'
						? 'Admin'
						: user.role === 'jury'
							? 'Jury'
							: 'Participant'}
				</span>
				{#if isParticipant && teamCategory && category}
					<span
						class="team-challenge"
						style="background: color-mix(in srgb, {category.color} 20%, transparent); color: {category.color}; border: 1px solid color-mix(in srgb, {category.color} 30%, transparent);"
					>
						{category.name} Challenge
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<nav class="sidebar-nav">
		{#if isAuthenticated}
			<a class="nav-link" href="/" class:active={$page.url.pathname === '/'}>
				<SidebarElement icon={IconNames.Home} text="Home" />
			</a>
			<a class="nav-link" href="/info" class:active={$page.url.pathname === '/info'}>
				<SidebarElement icon={IconNames.Info} text="Info" />
			</a>

			{#if user?.admin || user?.role === 'admin'}
				<a
					class="nav-link"
					href="/admin/dashboard"
					class:active={$page.url.pathname.startsWith('/admin/dashboard')}
				>
					<SidebarElement icon={IconNames.Stats} text="Admin Dashboard" />
				</a>
				<a
					class="nav-link"
					href="/presentations"
					class:active={$page.url.pathname === '/presentations'}
				>
					<SidebarElement icon={IconNames.Presentation} text="View Presentations" />
				</a>

				<a class="nav-link" href="/ranking" class:active={$page.url.pathname === '/ranking'}>
					<SidebarElement icon={IconNames.Ranking} text="Rankings" />
				</a>
			{:else if user?.role === 'jury'}
				<a
					class="nav-link"
					href="/presentations"
					class:active={$page.url.pathname === '/presentations'}
				>
					<SidebarElement icon={IconNames.Presentation} text="View Presentations" />
				</a>
				<a
					class="nav-link"
					href="/rate_presentation"
					class:active={$page.url.pathname === '/rate_presentation'}
				>
					<SidebarElement icon={IconNames.Rate} text="Rate Presentations" />
				</a>
				<a class="nav-link" href="/ranking" class:active={$page.url.pathname === '/ranking'}>
					<SidebarElement icon={IconNames.Ranking} text="Rankings" />
				</a>
			{:else if user?.role === 'participant' || user?.team}
				<a class="nav-link" href="/upload" class:active={$page.url.pathname === '/upload'}>
					<SidebarElement icon={IconNames.Upload} text="Upload Presentation" />
				</a>

				<a
					class="nav-link"
					href="/my-submission"
					class:active={$page.url.pathname === '/my-submission'}
				>
					<SidebarElement icon={IconNames.Presentation} text="My Submissions" />
				</a>
				{#if $page.data.allJuriesConfirmed && $page.data.allAdminsConfirmed}
					<a class="nav-link" href="/ranking" class:active={$page.url.pathname === '/ranking'}>
						<SidebarElement icon={IconNames.Ranking} text="Rankings" />
					</a>
				{/if}
			{/if}
			<!-- <form method="get" action="/logout" style="display:inline"> -->
			<!-- 	<button class="btn" type="submit">Logout</button> -->
			<!-- </form> -->
		{:else}
			<a class="nav-link" href="/info" class:active={$page.url.pathname === '/info'}>
				<SidebarElement icon={IconNames.Info} text="Info" />
			</a>
			<a class="nav-link" href="/login" class:active={$page.url.pathname === '/login'}>
				<SidebarElement icon={IconNames.Login} text="Login" />
			</a>
		{/if}
	</nav>

	<div class="sidebar-footer">
		<p class="text-sm text-gray-500">© {$page.data.eventConfig.year} {$page.data.eventConfig.organizer}</p>
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

	.user-info-sidebar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
	}

	.user-name-sidebar {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
		font-weight: 500;
		text-align: center;
	}

	.user-role-sidebar {
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		text-align: center;
	}

	.user-role-sidebar.admin {
		background: linear-gradient(to right, #ff6b6b, #ee5a6f);
		color: white;
	}

	.user-role-sidebar.jury {
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
	}

	.team-challenge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-top: 0.25rem;
	}

	.team-challenge.wellness {
		background: rgba(54, 195, 153, 0.2);
		color: #36c399;
		border: 1px solid rgba(54, 195, 153, 0.3);
	}

	.team-challenge.commerce {
		background: rgba(247, 166, 84, 0.2);
		color: #f7a654;
		border: 1px solid rgba(247, 166, 84, 0.3);
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
