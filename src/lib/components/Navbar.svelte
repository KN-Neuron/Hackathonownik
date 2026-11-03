<script lang="ts">
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { Badge } from '$lib/components/ui';

	// On phones the menu is collapsed behind a button, so the page content starts right away
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	let user = $derived($page.data.user);
	let teamCategory = $derived($page.data.teamCategory);

	let isParticipant = $derived(
		user &&
			!user.admin &&
			user.role !== 'admin' &&
			user.role !== 'jury' &&
			(user.role === 'participant' || user.team)
	);

	let navLinks = $derived.by(() => {
		if (!user) {
			return [
				{ href: '/', label: 'Home' },
				{ href: '/login', label: 'Login' }
			];
		}

		const links = [{ href: '/', label: 'Home' }];

		if (user.admin || user.role === 'admin') {
			links.push(
				{ href: '/admin/dashboard', label: 'Admin Dashboard' },
				{ href: '/admin/ratings', label: 'All ratings' },
				{ href: '/admin/people', label: 'People and teams' },
				{ href: '/present', label: 'Presenter mode' },
				{ href: '/admin/audit', label: 'Audit log' },
				{ href: '/presentations', label: 'View Presentations' },
				{ href: '/ranking', label: 'Rankings' }
			);
		} else if (user.role === 'jury') {
			links.push(
				{ href: '/presentations', label: 'View Presentations' },
				{ href: '/rate_presentation', label: 'Rate Presentations' }
			);
			if ($page.data.rankingVisible) {
				links.push({ href: '/ranking', label: 'Rankings' });
			}
		} else if (user.role === 'participant' || user.team) {
			links.push({ href: '/upload', label: 'Submit Project' });
			links.push({ href: '/my-submission', label: 'My Submission' });
			if ($page.data.rankingVisible) {
				links.push({ href: '/ranking', label: 'Rankings' });
			}
		}

		links.push({ href: '/logout', label: 'Logout' });

		return links;
	});

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	const eventConfig = $page.data.eventConfig;
	const category = $derived(eventConfig.categories.find((c) => c.key === teamCategory));
	// A juror can judge several categories
	const juryCategories = $derived(
		user?.role === 'jury' && Array.isArray(user.jury_categories)
			? eventConfig.categories.filter((c: { key: string }) => user.jury_categories.includes(c.key))
			: []
	);
</script>

<nav class="navbar">
	<div class="container">
		<div class="brand">
			<a href="/">{$page.data.eventConfig.name} {$page.data.eventConfig.year}</a>
			<button
				type="button"
				class="menu-toggle"
				aria-expanded={menuOpen}
				aria-controls="main-menu"
				onclick={() => (menuOpen = !menuOpen)}
			>
				{menuOpen ? 'Close' : 'Menu'}
			</button>
		</div>

		<ul class="nav-links" id="main-menu" class:open={menuOpen}>
			{#each navLinks as link}
				<li>
					<a href={link.href} class:active={isActive(link.href)}>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>

		{#if user}
			<div class="user-info" class:open={menuOpen}>
				<span class="user-name">{user.name || user.email}</span>
				<div class="user-badges">
					<Badge
						variant={user.admin || user.role === 'admin'
							? 'admin'
							: user.role === 'jury'
								? 'jury'
								: 'default'}
						class="user-role"
					>
						{user.admin || user.role === 'admin'
							? 'Admin'
							: user.role === 'jury'
								? 'Jury'
								: 'Participant'}
					</Badge>
					{#if isParticipant && teamCategory && category}
						<Badge
							style="background: color-mix(in srgb, {category.color} 16%, transparent); color: {category.color};"
							class="team-challenge"
						>
							{category.name}
						</Badge>
					{/if}
					{#each juryCategories as juryCategory (juryCategory.key)}
						<Badge
							style="background: color-mix(in srgb, {juryCategory.color} 16%, transparent); color: {juryCategory.color};"
							class="team-challenge"
						>
							{juryCategory.name}
						</Badge>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		background-color: var(--sidebar-bg);
		border-bottom: 1px solid var(--line);
		padding: 0.75rem 0;
		position: sticky;
		top: 0;
		z-index: 1000;
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.brand a {
		font-size: 1.25rem;
		font-weight: 700;
		color: #fff;
		text-decoration: none;
		transition: color 0.2s;
	}

	.brand a:hover {
		color: var(--action-hover);
	}

	.nav-links {
		display: flex;
		list-style: none;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		flex: 1;
	}

	.nav-links li {
		margin: 0;
	}

	.nav-links a {
		display: block;
		padding: 0.5rem 1rem;
		color: var(--text-muted);
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all 0.2s;
		font-weight: 500;
	}

	.nav-links a:hover {
		color: #f0f0f0; /* var(--text-primary) */
		background-color: rgba(255, 255, 255, 0.05);
	}

	.nav-links a.active {
		color: #fff;
		background: rgba(139, 135, 255, 0.16);
		box-shadow: inset 0 0 0 1px rgba(139, 135, 255, 0.35);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-name {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
	}

	.user-badges {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.user-role {
		padding: 0.25rem 0.75rem !important;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.team-challenge {
		padding: 0.25rem 0.6rem !important;
		border-radius: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
	}

	.menu-toggle {
		display: none;
	}

	@media (max-width: 768px) {
		.container {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.brand {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
		}

		.menu-toggle {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
			padding: 0 1rem;
			border-radius: 0.5rem;
			border: 1px solid rgba(255, 255, 255, 0.2);
			background: rgba(139, 135, 255, 0.16);
			color: #fff;
			font-weight: 600;
		}

		.nav-links,
		.user-info {
			display: none;
		}

		.nav-links.open {
			display: flex;
		}

		.user-info.open {
			display: flex;
		}

		.nav-links {
			flex-direction: column;
			gap: 0.25rem;
		}

		.nav-links a {
			display: flex;
			align-items: center;
			min-height: 44px;
		}

		.user-info {
			justify-content: center;
			padding-top: 0.5rem;
			border-top: 1px solid var(--line);
			flex-wrap: wrap;
		}

		.user-badges {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
