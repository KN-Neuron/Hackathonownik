<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data } = $props();
	let search = $state('');
	let teams = $derived(
		data.teams.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	const jurorOf = (id: string) => data.jurors.find((j) => j.id === id);
	const total = (scores: Record<string, number>) =>
		data.criteria.reduce((sum, c) => sum + (Number(scores[c.key]) || 0), 0);
	const maxTotal = $derived(data.criteria.reduce((sum, c) => sum + c.maxScore, 0));
	const fmt = (d: string) => new Date(d.replace(' ', 'T')).toLocaleString();
</script>

<div class="page">
	<HeaderText icon={IconNames.Ranking} text="All ratings" />
	<p class="text-base-content/70">
		Every rating of every juror, both stages, with comments. Stage now:
		<b>{data.stage === 'final' ? 'final' : 'preliminary round'}</b>. Criteria rated only in the
		final are marked <b>(final)</b>.
	</p>

	<CategoryTabs keys={data.categories.map((c) => c.key)} selected={data.category} />

	<input
		type="search"
		class="input input-bordered w-full max-w-md"
		placeholder="Find a team…"
		bind:value={search}
		aria-label="Find a team"
	/>

	{#each teams as team (team.id)}
		<section class="team">
			<h3>
				#{team.order}
				{team.name}
				{#if data.stage === 'final' && data.finalists.includes(team.id)}
					<span class="badge badge-warning badge-sm">finalist</span>
				{/if}
				<span class="count">{team.ratings.length}/{data.jurors.length} rated</span>
			</h3>
			{#if team.ratings.length === 0}
				<p class="none">No ratings yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th>Juror</th>
								{#each data.criteria as c (c.key)}
									<th>{c.name} /{c.maxScore}{c.stage === 'final' ? ' (final)' : ''}</th>
								{/each}
								<th>Total /{maxTotal}</th>
								<th>Comment</th>
								<th>Updated</th>
							</tr>
						</thead>
						<tbody>
							{#each team.ratings as r (r.jury)}
								{@const juror = jurorOf(r.jury)}
								<tr>
									<td class="font-medium">
										{juror?.name}
										{#if juror?.note}<span class="note">({juror.note})</span>{/if}
									</td>
									{#each data.criteria as c (c.key)}
										<td>{r.scores[c.key] ?? '–'}</td>
									{/each}
									<td><b>{total(r.scores)}</b></td>
									<td class="comment">{r.comments || '–'}</td>
									<td class="text-base-content/60">{fmt(r.updated)}</td>
								</tr>
							{/each}
							<!-- Assigned jurors who haven't rated this team -->
							{#each data.jurors.filter((j) => !team.ratings.some((r) => r.jury === j.id)) as j (j.id)}
								<tr class="missing">
									<td>{j.name}</td>
									<td colspan={data.criteria.length + 3}>not rated</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{:else}
		<p class="none">No teams in this category.</p>
	{/each}
</div>

<style>
	.page {
		max-width: 1300px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.team {
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	h3 {
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.count {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.6);
	}

	.none,
	.missing td {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
	}

	.note {
		font-size: 0.75rem;
		font-weight: 400;
		color: #f7a654;
	}

	.comment {
		max-width: 24rem;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
</style>
