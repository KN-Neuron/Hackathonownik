<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui';

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
				{ href: '/presentations', label: 'View Presentations' },
				{ href: '/ranking', label: 'Rankings' }
			);
		} else if (user.role === 'jury') {
			links.push(
				{ href: '/presentations', label: 'View Presentations' },
				{ href: '/rate_presentation', label: 'Rate Presentations' },
				{ href: '/ranking', label: 'Rankings' }
			);
		} else if (user.role === 'participant' || user.team) {
			links.push({ href: '/upload', label: 'Upload Presentation' });
			links.push({ href: '/my-submission', label: 'My Submissions' });
			if ($page.data.allJuriesConfirmed && $page.data.allAdminsConfirmed) {
				links.push({ href: '/ranking', label: 'Rankings' });
			}
		}

		links.push({ href: '/logout', label: 'Logout' });

		return links;
	});

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="navbar">
	<div class="container">
		<div class="brand">
			<a href="/">Heroes of the Brain 2025</a>
		</div>

		<ul class="nav-links">
			{#each navLinks as link}
				<li>
					<a href={link.href} class:active={isActive(link.href)}>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>

		{#if user}
			<div class="user-info">
				<span class="user-name">{user.name || user.email}</span>
				<div class="user-badges">
					<Badge
						variant={user.admin || user.role === 'admin' ? 'admin' : user.role === 'jury' ? 'jury' : 'default'}
						class="user-role"
					>
						{user.admin || user.role === 'admin'
							? 'Admin'
							: user.role === 'jury'
								? 'Jury'
								: 'Participant'}
					</Badge>
					{#if isParticipant && teamCategory}
						<Badge
							variant={teamCategory === 'wellness' ? 'wellness' : 'commerce'}
							class="team-challenge"
						>
							{teamCategory === 'wellness' ? 'Wellness' : 'Commerce'}
						</Badge>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		background-color: rgba(20, 21, 24, 0.95);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1); /* var(--border-default) */
		padding: 0.75rem 0;
		position: sticky;
		top: 0;
		z-index: 1000;
		backdrop-filter: blur(10px);
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
		color: #7f7bff; /* var(--brand-purple) */
		text-decoration: none;
		transition: color 0.2s;
	}

	.brand a:hover {
		color: #4df2ff; /* var(--brand-blue) */
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
		color: rgba(255, 255, 255, 0.7); /* var(--text-secondary) */
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all 0.2s;
		font-weight: 500;
	}

	.nav-links a:hover {
		color: #f0f0f0; /* var(--text-primary) */
		background-color: rgba(127, 123, 255, 0.1);
	}

	.nav-links a.active {
		color: #f0f0f0; /* var(--text-primary) */
		background: linear-gradient(to right, rgba(127, 123, 255, 0.2), rgba(77, 242, 255, 0.2));
		border-bottom: 2px solid #7f7bff; /* var(--brand-purple) */
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
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	@media (max-width: 768px) {
		.container {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.nav-links {
			flex-direction: column;
			gap: 0.25rem;
		}

		.user-info {
			justify-content: center;
			padding-top: 0.5rem;
			border-top: 1px solid rgba(255, 255, 255, 0.1); /* var(--border-default) */
			flex-wrap: wrap;
		}

		.user-badges {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
