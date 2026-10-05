<script>
	import { page } from '$app/stores';
</script>

<footer>
	<p>&copy; {$page.data.eventConfig.year} {$page.data.eventConfig.organizer}</p>
	<span class="separator" aria-hidden="true">·</span>
	<p class="author">
		Made by Grzegorz Szczepanek
		<a
			href="https://github.com/grzegorzszczepanek"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="GitHub"
			title="GitHub"
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
				<path
					d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
				/>
			</svg>
		</a>
		<a
			href="https://www.linkedin.com/in/grzegorz-szczepanek-ab4479250/"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="LinkedIn"
			title="LinkedIn"
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
				<path
					d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"
				/>
			</svg>
		</a>
	</p>
</footer>

<style>
	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		column-gap: 0.25rem;
		background-color: black;
		color: white;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	p {
		padding: 10px;
		text-align: center;
		font-size: 0.8rem;
	}
	.separator {
		font-size: 0.8rem;
		opacity: 0.5;
	}
	.author {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	a {
		display: inline-flex;
		color: rgba(255, 255, 255, 0.7);
		transition: color 0.15s ease;
	}
	a:hover {
		color: white;
	}

	@media (max-width: 768px) {
		footer {
			padding: 0.5rem;
		}

		p {
			font-size: 0.7rem;
			padding: 8px 5px;
		}

		.separator {
			display: none;
		}
	}
</style>
