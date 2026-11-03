<script>
	let { data } = $props();
</script>

<div class="info-page">
	<header>
		<h1>Info</h1>
		<p>Schedule, useful links and who to ask.</p>
	</header>

	<section>
		<h2>Schedule</h2>
		<div class="days">
			{#each data.eventConfig.schedule as day}
				<div class="card day">
					<h3>{day.day}</h3>
					<ul>
						{#each day.events as event}
							<li>
								<span class="time">{event.time}</span>
								<span>{event.description}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Useful links</h2>
		<div class="links">
			{#each data.eventConfig.links as link}
				<div class="card link">
					<h3>{link.title}</h3>
					<p>{link.description}</p>
					<a href={link.url} target="_blank" rel="noopener noreferrer">{link.buttonText}</a>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Contact</h2>
		<div class="card">
			<p class="contact">
				In case of problems or questions, contact the organizers using the links above.
			</p>
		</div>
	</section>
</div>

<style>
	.info-page {
		display: flex;
		flex-direction: column;
		gap: 32px;
		max-width: 1100px;
	}

	header p {
		margin: 8px 0 0;
		color: var(--text-muted);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	.card {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		padding: 20px 24px;
	}

	.days {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 16px;
	}

	.day h3 {
		margin-bottom: 8px;
		font-size: 16px;
		font-weight: 700;
		color: #fff;
	}

	.day ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.day li {
		display: flex;
		gap: 16px;
		padding: 12px 0;
		border-top: 1px solid var(--line);
		color: #d6dbe8;
	}

	.day li:first-child {
		border-top: 0;
	}

	.time {
		flex: 0 0 120px;
		font-weight: 600;
		color: #fff;
	}

	.links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}

	.link {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.link h3 {
		font-size: 16px;
		font-weight: 700;
		color: #fff;
	}

	.link p {
		font-size: 14px;
		color: var(--text-muted);
	}

	.link a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-weight: 600;
	}

	.contact {
		color: #d6dbe8;
	}

	@media (max-width: 640px) {
		.time {
			flex-basis: 96px;
		}
	}
</style>
