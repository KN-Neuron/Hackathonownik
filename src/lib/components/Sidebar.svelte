<script>
	import SidebarElement from '$lib/components/SidebarElement.svelte';
	import DeadlineCountdown from '$lib/components/DeadlineCountdown.svelte';
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
	// A juror can judge several categories
	const juryCategories = $derived(
		user?.role === 'jury' && Array.isArray(user.jury_categories)
			? eventConfig.categories.filter((/** @type {{ key: string }} */ c) =>
					user.jury_categories.includes(c.key)
				)
			: []
	);
</script>

<aside class:open>
	<div class="sidebar-header">
		<a href="/" class="brand">
			{$page.data.eventConfig.name}
			<span>{$page.data.eventConfig.year}</span>
		</a>
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
						style="background: color-mix(in srgb, {category.color} 16%, transparent); color: {category.color};"
					>
						{category.name}
					</span>
				{/if}
				{#if isParticipant}
					<DeadlineCountdown deadline={eventConfig.deadline} />
				{/if}
				{#each juryCategories as juryCategory (juryCategory.key)}
					<span
						class="team-challenge"
						style="background: color-mix(in srgb, {juryCategory.color} 16%, transparent); color: {juryCategory.color};"
					>
						{juryCategory.name}
					</span>
				{/each}
				{#if user.role === 'jury' && juryCategories.length === 0}
					<span class="pill pill-warning">No category assigned yet</span>
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
				<a
					class="nav-link"
					href="/admin/ratings"
					class:active={$page.url.pathname.startsWith('/admin/ratings')}
				>
					<SidebarElement icon={IconNames.Rate} text="All ratings" />
				</a>
				<a
					class="nav-link"
					href="/admin/people"
					class:active={$page.url.pathname.startsWith('/admin/people')}
				>
					<SidebarElement icon={IconNames.Stats} text="People and teams" />
				</a>
				<a
					class="nav-link"
					href="/present"
					class:active={$page.url.pathname.startsWith('/present')}
				>
					<SidebarElement icon={IconNames.Presentation} text="Presenter mode" />
				</a>
				<a
					class="nav-link"
					href="/admin/audit"
					class:active={$page.url.pathname.startsWith('/admin/audit')}
				>
					<SidebarElement icon={IconNames.Info} text="Audit log" />
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
				{#if $page.data.rankingVisible}
					<a class="nav-link" href="/ranking" class:active={$page.url.pathname === '/ranking'}>
						<SidebarElement icon={IconNames.Ranking} text="Rankings" />
					</a>
				{/if}
			{:else if user?.role === 'participant' || user?.team}
				<a class="nav-link" href="/upload" class:active={$page.url.pathname === '/upload'}>
					<SidebarElement icon={IconNames.Upload} text="Submit Project" />
				</a>

				<a
					class="nav-link"
					href="/my-submission"
					class:active={$page.url.pathname === '/my-submission'}
				>
					<SidebarElement icon={IconNames.Presentation} text="My Submission" />
				</a>
				{#if $page.data.rankingVisible}
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
		<p>
			© {$page.data.eventConfig.year}
			{$page.data.eventConfig.organizer}
		</p>
	</div>
</aside>

<style>
	aside {
		height: 100%;
		z-index: 70;
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 24px 16px;
		background: var(--sidebar-bg);
		border-right: 1px solid var(--line);
		color: var(--text);
	}

	.sidebar-header {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.brand {
		display: block;
		padding: 0 8px;
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.2;
		color: #fff;
		text-decoration: none;
	}

	.brand span {
		color: var(--action);
	}

	.user-info-sidebar {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--line);
		border-radius: 12px;
	}

	.user-name-sidebar {
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.user-role-sidebar,
	.team-challenge {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-muted);
	}

	.user-role-sidebar.admin {
		background: rgba(255, 107, 107, 0.16);
		color: #ff9a9a;
	}

	.user-role-sidebar.jury {
		background: rgba(77, 242, 255, 0.14);
		color: var(--focus);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-link {
		display: block;
		text-decoration: none;
		color: var(--text-muted);
		border-radius: var(--radius-control);
	}

	.nav-link:hover {
		background-color: rgba(255, 255, 255, 0.05);
		color: #fff;
	}

	.nav-link.active {
		background: rgba(139, 135, 255, 0.16);
		color: #fff;
		box-shadow: inset 0 0 0 1px rgba(139, 135, 255, 0.35);
	}

	.sidebar-footer {
		margin-top: auto;
		padding: 0 8px;
		font-size: 12px;
		color: var(--text-faint);
	}

	@media (max-width: 767px) {
		aside {
			position: fixed;
			top: 0;
			left: -100%;
			width: 100%;
			max-width: 320px;
			transition: left 0.3s ease-in-out;
			height: 100vh;
			overflow-y: auto;
		}

		.open {
			left: 0;
		}
	}
</style>
