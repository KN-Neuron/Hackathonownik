<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import { SUBMISSION_ITEM_LABELS, type SubmissionItem } from '$lib/types';

	let { data } = $props();
	let search = $state('');
	let role = $state<'all' | 'participant' | 'jury' | 'admin'>('all');

	const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
	let teams = $derived(
		data.teams.filter((t) => matches(`${t.name} ${t.category} ${t.members.join(' ')}`))
	);
	let users = $derived(
		data.users.filter(
			(u) =>
				(role === 'all' || u.role === role) && matches(`${u.name} ${u.email} ${u.team} ${u.role}`)
		)
	);

	// Things the organizers should look at
	let problems = $derived([
		...data.teams
			.filter((t) => t.members.length < data.teamRules.min || t.members.length > data.teamRules.max)
			.map((t) => `Team "${t.name}" has ${t.members.length} member(s) (rules: 3–4).`),
		...data.teams
			.filter((t) => !t.validCategory)
			.map((t) => `Team "${t.name}" has no valid category.`),
		...data.users
			.filter((u) => u.role === 'participant' && !u.team)
			.map((u) => `${u.email} is a participant without a team.`),
		...data.users
			.filter((u) => u.role === 'jury' && u.juryCategories.length === 0)
			.map((u) => `Juror ${u.email} has no category.`),
		...data.users
			.filter((u) => !['participant', 'jury', 'admin'].includes(u.role))
			.map((u) => `${u.email} has no valid role.`)
	]);

	const items = ['presentation', 'repo', 'video', 'final_presentation'] as SubmissionItem[];
	const fmt = (d: string) => new Date(d.replace(' ', 'T')).toLocaleString();
</script>

<div class="page">
	<HeaderText icon={IconNames.Stats} text="People and teams" />

	<div class="stats">
		<div><b>{data.counts.participants}</b> participants</div>
		<div><b>{data.counts.teams}</b> teams</div>
		<div><b>{data.counts.jurors}</b> jurors</div>
		<div><b>{data.counts.admins}</b> admins</div>
	</div>

	{#if problems.length}
		<div class="problems">
			<b>{problems.length} thing(s) to look at</b>
			<ul>
				{#each problems as p (p)}<li>{p}</li>{/each}
			</ul>
		</div>
	{/if}

	<input
		type="search"
		class="input input-bordered w-full max-w-md"
		placeholder="Search names, e-mails, teams…"
		bind:value={search}
		aria-label="Search"
	/>

	<h2>Teams ({teams.length})</h2>
	<div class="overflow-x-auto bg-base-200 rounded-lg">
		<table class="table table-sm w-full">
			<thead>
				<tr>
					<th>Team</th>
					<th>Category</th>
					<th>Members</th>
					{#each items as item (item)}<th title={SUBMISSION_ITEM_LABELS[item]}
							>{item === 'final_presentation'
								? 'Final'
								: item === 'presentation'
									? 'PDF'
									: item === 'repo'
										? 'Repo'
										: 'Video'}</th
						>{/each}
					<th>Last change</th>
				</tr>
			</thead>
			<tbody>
				{#each teams as team (team.id)}
					<tr>
						<td class="font-medium">
							<details>
								<summary>{team.name}</summary>
								{#if team.history.length}
									<ul class="history">
										{#each team.history as h (h.at)}
											<li>
												{fmt(h.at)} · {h.by ?? 'unknown'} · {h.items
													.map((i) => SUBMISSION_ITEM_LABELS[i])
													.join(', ')}
											</li>
										{/each}
									</ul>
								{:else}
									<p class="history">Nothing submitted.</p>
								{/if}
							</details>
						</td>
						<td class={team.validCategory ? '' : 'text-error'}>{team.category}</td>
						<td class={team.members.length < 3 || team.members.length > 4 ? 'text-error' : ''}>
							{team.members.length}: {team.members.join(', ') || '–'}
						</td>
						{#each items as item (item)}
							<td>{team.items[item] ? '✓' : '–'}</td>
						{/each}
						<td class="text-base-content/70"
							>{team.lastUpdated ? fmt(team.lastUpdated) : 'nothing yet'}</td
						>
					</tr>
				{:else}
					<tr><td colspan="8" class="text-center text-base-content/60">No teams</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h2>Accounts ({users.length})</h2>
	<div class="join mb-2">
		{#each ['all', 'participant', 'jury', 'admin'] as r (r)}
			<button
				class="btn btn-xs join-item"
				class:btn-active={role === r}
				onclick={() => (role = r as typeof role)}>{r}</button
			>
		{/each}
	</div>
	<div class="overflow-x-auto bg-base-200 rounded-lg">
		<table class="table table-sm w-full">
			<thead>
				<tr
					><th>Name</th><th>E-mail</th><th>Role</th><th>Team</th><th>Jury categories</th><th
						>Confirmed</th
					><th>Created</th></tr
				>
			</thead>
			<tbody>
				{#each users as u (u.id)}
					<tr>
						<td class="font-medium">{u.name || '–'}</td>
						<td>{u.email}</td>
						<td>{u.role}</td>
						<td>{u.team || '–'}</td>
						<td>{u.juryCategories.join(', ') || '–'}</td>
						<td>{u.confirmed.join(', ') || '–'}</td>
						<td class="text-base-content/70">{fmt(u.created)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.page {
		max-width: 1300px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-top: 0.5rem;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
	}

	.problems {
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(247, 166, 84, 0.1);
		border: 1px solid rgba(247, 166, 84, 0.5);
	}

	.problems ul {
		margin-top: 0.25rem;
		font-size: 0.9rem;
	}

	summary {
		cursor: pointer;
	}

	.history {
		margin: 0.25rem 0 0.25rem 1rem;
		font-size: 0.8rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.65);
	}
</style>
