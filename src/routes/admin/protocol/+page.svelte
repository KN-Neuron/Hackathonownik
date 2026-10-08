<script lang="ts">
	let { data } = $props();

	const total = (scores: Record<string, number>) =>
		data.ranking.criteria.reduce((sum, c) => sum + (Number(scores[c.key]) || 0), 0);
	const scoresOf = (jury: string, team: string) =>
		data.scores.find((s) => s.jury === jury && s.team === team)?.scores ?? null;
	const maxTotal = data.ranking.criteria.reduce((sum, c) => sum + c.maxScore, 0);
</script>

<div class="protocol">
	<div class="no-print actions">
		<a href="/admin/dashboard?category={data.category.key}" class="btn btn-sm btn-ghost">← Back</a>
		<button class="btn btn-sm btn-primary" onclick={() => window.print()}>Print</button>
	</div>

	<h1>Jury protocol</h1>
	<p class="subtitle">
		{data.event} · Category: <b>{data.category.name}</b> ·
		{data.ranking.stage === 'final' ? 'Final' : 'Preliminary round'} · generated
		{new Date(data.generatedAt).toLocaleString()}
	</p>

	<h2>Ranking</h2>
	<table>
		<thead>
			<tr>
				<th>Place</th>
				<th>Team</th>
				{#each data.ranking.criteria as c (c.key)}<th>{c.name} (max {c.maxScore})</th>{/each}
				<th>Total (max {maxTotal})</th>
			</tr>
		</thead>
		<tbody>
			{#each data.ranking.rankings as team (team.teamId)}
				<tr>
					<td>{team.rank}{team.wonTieBreak ? '*' : ''}</td>
					<td>{team.team}</td>
					{#each data.ranking.criteria as c (c.key)}<td>{team.scores[c.key]?.toFixed(2)}</td>{/each}
					<td><b>{team.finalGrade.toFixed(2)}</b></td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="note">
		Scores are averages of the jurors' ratings.
		{#if data.ranking.rankings.some((t) => t.wonTieBreak)}* First place decided by a jury vote after
			a tie.{/if}
	</p>
	{#if data.ranking.nonFinalists.length}
		<p class="note">Did not reach the final: {data.ranking.nonFinalists.join(', ')}.</p>
	{/if}

	<h2>Individual ratings</h2>
	{#each data.juries as jury (jury.id)}
		<h3>{jury.name}</h3>
		<table>
			<thead>
				<tr>
					<th>Team</th>
					{#each data.ranking.criteria as c (c.key)}<th>{c.name}</th>{/each}
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ranking.rankings as team (team.teamId)}
					{@const s = scoresOf(jury.id, team.teamId)}
					<tr>
						<td>{team.team}</td>
						{#each data.ranking.criteria as c (c.key)}<td>{s?.[c.key] ?? '–'}</td>{/each}
						<td>{s ? total(s) : '–'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/each}

	<h2>Signatures</h2>
	<div class="signatures">
		{#each data.juries as jury (jury.id)}
			<div class="signature">
				<div class="line"></div>
				{jury.name}
			</div>
		{/each}
	</div>
</div>

<style>
	.protocol {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1.5rem;
		background: #fff;
		color: #111;
	}

	.actions {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
	}

	h2 {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 1.5rem 0 0.5rem;
	}

	h3 {
		font-weight: 600;
		margin: 1rem 0 0.25rem;
	}

	.subtitle,
	.note {
		font-size: 0.9rem;
		color: #444;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	th,
	td {
		border: 1px solid #bbb;
		padding: 0.3rem 0.5rem;
		text-align: left;
	}

	th {
		background: #f2f2f2;
	}

	.signatures {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 2rem;
		margin-top: 2.5rem;
	}

	.signature {
		font-size: 0.9rem;
	}

	.line {
		border-bottom: 1px solid #111;
		height: 2.5rem;
		margin-bottom: 0.25rem;
	}

	@media print {
		.no-print {
			display: none;
		}

		.protocol {
			padding: 0;
		}

		:global(aside),
		:global(nav),
		:global(footer),
		:global(.mobile-only) {
			display: none !important;
		}

		:global(main.content-wrapper) {
			background: #fff !important;
			padding: 0 !important;
		}
	}
</style>
