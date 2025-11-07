<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		user?: any;
	}

	let { user }: Props = $props();

	// Determine which links to show based on user role
	const navLinks = $derived(() => {
		if (!user) {
			return [
				{ href: '/', label: 'Home' },
				{ href: '/login', label: 'Login' }
			];
		}

		const links = [{ href: '/', label: 'Home' }];

		// Admin sees everything
		if (user.admin) {
			links.push(
				{ href: '/upload', label: 'Upload' },
				{ href: '/rankings', label: 'Rankings' },
				{ href: '/jury', label: 'Jury Panel' },
				{ href: '/admin', label: 'Admin Panel' }
			);
		}
		// Jury
		else if (user.role === 'jury') {
			links.push(
				{ href: '/rankings', label: 'Rankings' },
				{ href: '/jury', label: 'Rate Presentations' }
			);
		}
		// Participant
		else if (user.role === 'participant' || user.team) {
			links.push({ href: '/upload', label: 'Upload' }, { href: '/rankings', label: 'Rankings' });
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
			{#each navLinks() as link}
				<li>
					<a
						href={link.href}
						class:active={isActive(link.href)}
						data-sveltekit-reload={link.href === '/logout'}
					>
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
		background: rgba(30, 31, 34, 0.95);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(127, 123, 255, 0.2);
		position: sticky;
		top: 0;
		z-index: 100;
		padding: 0.75rem 0;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.brand a {
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(to right, #7f7bff, #4df2ff);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.brand a:hover {
		opacity: 0.8;
	}

	.nav-links {
		display: flex;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
	}

	.nav-links a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.2s;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.nav-links a:hover {
		color: #fff;
		background: rgba(127, 123, 255, 0.1);
	}

	.nav-links a.active {
		color: #7f7bff;
		background: rgba(127, 123, 255, 0.15);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.user-name {
		color: #f0f0f0;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.user-role {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background: rgba(77, 242, 255, 0.2);
		color: #4df2ff;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.user-role.admin {
		background: rgba(255, 77, 77, 0.2);
		color: #ff4d4d;
	}

	.user-role.jury {
		background: rgba(255, 200, 77, 0.2);
		color: #ffc84d;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.container {
			flex-wrap: wrap;
		}

		.nav-links {
			order: 3;
			width: 100%;
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.25rem;
		}

		.nav-links a {
			padding: 0.4rem 0.75rem;
			font-size: 0.85rem;
		}

		.user-info {
			font-size: 0.85rem;
		}

		.user-name {
			display: none;
		}
	}
</style>
