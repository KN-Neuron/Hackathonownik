<script lang="ts">
	import { page } from '$app/stores';

	let { data }: { data: import('./$types').PageData } = $props();

	const title = $derived(`${data.eventConfig.name} ${data.eventConfig.year}`);
	// "Saturday, November 14 – Sunday, November 15", straight from the schedule
	const days = $derived(
		(data.eventConfig.schedule ?? []).map((d: { day: string }) => d.day).join(' – ')
	);
	const user = $derived($page.data.user);
	const home = $derived(
		user?.admin || user?.role === 'admin'
			? '/admin/dashboard'
			: user?.role === 'jury'
				? '/rate_presentation'
				: user
					? '/my-submission'
					: '/login'
	);
</script>

<div class="hero-stage">
	<div class="hero-copy">
		{#if days}<span class="when">{days}</span>{/if}
		<h1 class="hero">{title}</h1>

		<svg class="wave" viewBox="0 0 640 80" aria-hidden="true">
			<defs>
				<linearGradient id="wave-gradient" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#ff6ec7" />
					<stop offset=".45" stop-color="#7f7bff" />
					<stop offset="1" stop-color="#4df2ff" />
				</linearGradient>
			</defs>
			<path
				d="M0 40 Q35.6 6 71.1 40 Q106.7 74 142.2 40 Q177.8 6 213.3 40 Q248.9 74 284.4 40 Q320 6 355.6 40 Q391.1 74 426.7 40 Q462.2 6 497.8 40 Q533.3 74 568.9 40 Q604.4 6 640 40"
				fill="none"
				stroke="url(#wave-gradient)"
				stroke-width="6"
				stroke-linecap="round"
			/>
		</svg>

		<p class="lead">Submit your project, rate it, follow the stage and see the results.</p>
	</div>

	<div class="actions">
		<a class="btn btn-primary" href={home}>{user ? 'Open my page' : 'Log in'}</a>
		<a class="btn btn-secondary" href="/info">See the schedule</a>
	</div>
</div>

<style>
	.hero-stage {
		min-height: calc(100vh - 160px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 40px;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 24px;
		max-width: 880px;
	}

	.when {
		font-size: 16px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.hero {
		margin: 0;
		font-size: clamp(44px, 8vw, 104px);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 0.98;
		color: #fff;
		text-wrap: balance;
	}

	.wave {
		width: min(460px, 80%);
		height: auto;
	}

	.lead {
		margin: 0;
		max-width: 480px;
		font-size: 18px;
		line-height: 1.55;
		color: #b4bccd;
		text-wrap: pretty;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.actions .btn {
		text-decoration: none;
	}
</style>
