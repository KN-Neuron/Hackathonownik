<script lang="ts">
	import { page } from '$app/stores';
	import { pb } from '$lib/pocketbase.svelte';

	const user = $derived(pb.authStore.record);

	// Use $derived.by() for computed values with functions (Svelte 5 syntax)
	const navLinks = $derived.by(() => {
		if (!user) {
			return [
				{ href: '/', label: 'Home' },
				{ href: '/login', label: 'Login' }
			];
		}

		const links = [{ href: '/', label: 'Home' }];

		// Admin sees admin dashboard only (admins don't typically upload/rate)
		// Note: Server-side validation in hooks.server.ts ensures actual access control
		if (user.admin) {
			links.push(
				{ href: '/admin/dashboard', label: 'Admin Dashboard' }
			);
		}
		// Jury can see rate_presentation, presentations, and rankings at all times
		else if (user.role === 'jury') {
			links.push(
				{ href: '/presentations', label: 'View Presentations' },
				{ href: '/rate_presentation', label: 'Rate Presentations' },
				{ href: '/ranking', label: 'Rankings' }
			);
		}
		// Participant can ONLY see upload; presentation viewing and ranking are controlled by server
		else if (user.role === 'participant' || user.team) {
			links.push({ href: '/upload', label: 'Upload Presentation' });
			// Note: Server-side logic determines if these are actually accessible
			links.push({ href: '/presentations', label: 'View Presentations' });
			links.push({ href: '/ranking', label: 'Rankings' });
		}

		// Everyone who is logged in can logout
		links.push({ href: '/logout', label: 'Logout' });

		return links;
	});

	// Check if current path is active
	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="navbar">
	<div class="container">
		<div class="brand">
			<a href="/">Hackathon App</a>
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
				<span class="user-role" class:admin={user.admin} class:jury={user.role === 'jury'}>
					{user.admin ? 'Admin' : user.role === 'jury' ? 'Jury' : 'Participant'}
				</span>
			</div>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		background-color: rgba(20, 21, 24, 0.95);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
		color: #7f7bff;
		text-decoration: none;
		transition: color 0.2s;
	}

	.brand a:hover {
		color: #4df2ff;
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
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all 0.2s;
		font-weight: 500;
	}

	.nav-links a:hover {
		color: #ffffff;
		background-color: rgba(127, 123, 255, 0.1);
	}

	.nav-links a.active {
		color: #ffffff;
		background: linear-gradient(to right, rgba(127, 123, 255, 0.2), rgba(77, 242, 255, 0.2));
		border-bottom: 2px solid #7f7bff;
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

	.user-role {
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.user-role.admin {
		background: linear-gradient(to right, #ff6b6b, #ee5a6f);
		color: white;
	}

	.user-role.jury {
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
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
			border-top: 1px solid rgba(255, 255, 255, 0.1);
		}
	}
</style>
