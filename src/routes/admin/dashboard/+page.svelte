<script lang="ts">
	import { enhance } from '$app/forms';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import { IconNames } from '$lib/utils/utils';
	import type { EventCategory } from '$lib/types';

	let { data, form } = $props();
	let forcePublish = $state(false);
	let moveTeamId = $state('');
	let moveCategory = $state('');

	let icon = IconNames.Stats;
	let text = 'Admin Dashboard';

	let allCategories = $derived(data.eventConfig.categories as EventCategory[]);
	let current = $derived(allCategories.find((c) => c.key === data.category));
	let progress = $derived(data.progress);

	let badges = $derived(
		Object.fromEntries(
			Object.entries(
				data.summary as Record<
					string,
					{ teams: number; jurors: number; ready: boolean; published: boolean }
				>
			).map(([key, s]) => [
				key,
				s.published ? '✓ published' : s.ready ? 'ready' : `${s.teams} teams`
			])
		)
	);

	const categoryName = (key: string) => allCategories.find((c) => c.key === key)?.name ?? key;

	function confirmSubmit(message: string) {
		return (e: Event) => {
			if (!confirm(message)) e.preventDefault();
		};
	}
</script>

<div class="dashboard-container">
	<HeaderText {icon} {text} />

	{#if form?.message}
		<div class="alert mb-4 {form.success ? 'alert-success' : 'alert-error'}">
			<span>{form.message}</span>
		</div>
	{/if}

	{#if data.uncategorizedTeams.length}
		<div class="alert alert-warning mb-4">
			<span>
				{data.uncategorizedTeams.length} team(s) without a valid category, invisible to every juror:
				{data.uncategorizedTeams.map((t) => t.name).join(', ')}. Assign them below.
			</span>
		</div>
	{/if}

	{#if data.checkin}
		<div class="panel checkin-panel">
			<div>
				<b>Check-in: {data.checkin.done} of {data.checkin.total} teams</b>
				<span class="text-sm text-base-content/70">
					uploaded anything before {new Date(data.checkin.deadline).toLocaleString()}
				</span>
			</div>
			<div class="flex flex-wrap gap-3 text-sm">
				{#each allCategories as category (category.key)}
					<span style="color: {category.color}">
						{category.name}: {data.checkin.perCategory[category.key]?.done}/{data.checkin
							.perCategory[category.key]?.total}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<CategoryTabs keys={data.categories} selected={data.category} {badges} />

	{#if current && progress}
		<!-- Results of the selected category -->
		<section class="section">
			<div class="section-header">
				<h2>Results: {current.name}</h2>
				<p>
					Participants see this category's ranking, scores and feedback only after you publish it.
				</p>
			</div>

			<div class="panel">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						{#if data.published}
							<span class="badge badge-success">Published</span>
							{#if data.publishedAt}
								<span class="text-sm text-base-content/70 ml-2">
									since {new Date(data.publishedAt).toLocaleString()}
								</span>
							{/if}
							<p class="text-sm text-base-content/70 mt-2">Ratings are locked for the jury.</p>
						{:else}
							<span class="badge badge-ghost">Not published</span>
							<p class="text-sm mt-2">
								{progress.confirmedCount} of {progress.juries.length} jurors confirmed ·
								{progress.totalTeams} teams to rate
							</p>
						{/if}

						{#if progress.juries.length === 0}
							<p class="text-warning text-sm mt-2">No juror is assigned to this category yet.</p>
						{/if}
						<ul class="text-sm mt-2 space-y-1">
							{#each progress.juries as jury (jury.id)}
								<li class="flex items-center gap-2">
									<span class={jury.confirmed ? 'text-success' : 'text-warning'}>
										{jury.confirmed ? '✓' : '…'}
									</span>
									{jury.name}: rated {jury.ratedTeams}/{progress.totalTeams}{jury.confirmed
										? ', confirmed'
										: ''}
									{#if !jury.confirmed && !data.published && jury.ratedTeams === progress.totalTeams && progress.totalTeams > 0}
										<form method="POST" action="?/confirmForJury" use:enhance>
											<input type="hidden" name="csrf_token" value={data.csrfToken} />
											<input type="hidden" name="category" value={data.category} />
											<input type="hidden" name="jury_id" value={jury.id} />
											<button
												class="btn btn-xs btn-outline"
												onclick={confirmSubmit(`Confirm ratings for ${jury.name}?`)}
												>Confirm for juror</button
											>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					</div>

					{#if data.published}
						<form method="POST" action="?/unpublishCategory" use:enhance>
							<input type="hidden" name="csrf_token" value={data.csrfToken} />
							<input type="hidden" name="category" value={data.category} />
							<button
								class="btn btn-outline btn-warning"
								onclick={confirmSubmit(`Hide ${current.name} results from participants again?`)}
								>Unpublish</button
							>
						</form>
					{:else}
						<form method="POST" action="?/publishCategory" use:enhance class="flex flex-col gap-2">
							<input type="hidden" name="csrf_token" value={data.csrfToken} />
							<input type="hidden" name="category" value={data.category} />
							{#if !progress.readyToPublish}
								<label class="label cursor-pointer gap-2 justify-start">
									<input
										type="checkbox"
										class="checkbox checkbox-sm checkbox-warning"
										name="force"
										value="true"
										bind:checked={forcePublish}
									/>
									<span class="label-text text-sm">Publish anyway (not every juror is done)</span>
								</label>
							{/if}
							<button
								class="btn btn-primary"
								disabled={!progress.readyToPublish && !forcePublish}
								onclick={confirmSubmit(`Publish ${current.name} results to all participants now?`)}
								>Publish {current.name}</button
							>
						</form>
					{/if}
				</div>
			</div>
		</section>

		<!-- Submissions of the selected category -->
		<section class="section">
			<div class="section-header">
				<h2>Submissions: {current.name}</h2>
				<p>
					{data.submissionOverview.filter((t) => t.missing.length === 0).length} of
					{data.submissionOverview.length} teams complete. Required:
					{data.required.join(', ')}. Incomplete teams are listed first.
				</p>
			</div>
			<div class="overflow-x-auto bg-base-200 rounded-lg mt-4">
				<table class="table table-sm w-full">
					<thead>
						<tr>
							<th>Team</th>
							<th>PDF</th>
							<th>Repo</th>
							<th>Video</th>
							{#if data.checkin}<th>Check-in</th>{/if}
							<th>Last change</th>
						</tr>
					</thead>
					<tbody>
						{#each data.submissionOverview as team (team.teamId)}
							<tr class={team.missing.length ? 'text-warning' : ''}>
								<td class="font-medium">{team.teamName}</td>
								<td>{team.presentation ? '✓' : '✗'}</td>
								<td>{team.repo ? '✓' : '✗'}</td>
								<td>{team.video ? '✓' : data.required.includes('video') ? '✗' : '–'}</td>
								{#if data.checkin}
									<td>
										{team.checkin === 'done'
											? '✓'
											: team.checkin === 'missed'
												? 'missed'
												: 'not yet'}
									</td>
								{/if}
								<td class="text-base-content/70">
									{team.lastUpdated ? new Date(team.lastUpdated).toLocaleString() : 'nothing yet'}
								</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="text-center text-base-content/60">No teams yet</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- Juror assignment -->
	<section class="section">
		<div class="section-header">
			<h2>Jurors and categories</h2>
			<p>A juror sees and rates only the teams of the categories assigned here.</p>
		</div>
		<div class="overflow-x-auto bg-base-200 rounded-lg mt-4">
			<table class="table table-sm w-full">
				<thead>
					<tr>
						<th>Juror</th>
						{#each allCategories as category (category.key)}
							<th style="color: {category.color}">{category.name}</th>
						{/each}
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.juries as jury (jury.id)}
						<tr>
							<td class="font-medium">{jury.name}</td>
							{#each allCategories as category (category.key)}
								<td>
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										name="categories"
										value={category.key}
										form="jury-{jury.id}"
										checked={jury.categories.includes(category.key)}
										aria-label="{jury.name}: {category.name}"
									/>
								</td>
							{/each}
							<td>
								<form id="jury-{jury.id}" method="POST" action="?/setJuryCategories" use:enhance>
									<input type="hidden" name="csrf_token" value={data.csrfToken} />
									<input type="hidden" name="jury_id" value={jury.id} />
									<button class="btn btn-xs btn-primary">Save</button>
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan={allCategories.length + 2} class="text-center text-base-content/60">
								No jury accounts yet (users with role "jury")
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Moving a team -->
	<section class="section">
		<div class="section-header">
			<h2>Move a team to another category</h2>
			<p>
				The team's existing ratings are removed, because jurors and criteria differ per category.
			</p>
		</div>
		<form method="POST" action="?/setTeamCategory" use:enhance class="panel flex flex-wrap gap-2">
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<select class="select select-bordered select-sm" name="team_id" bind:value={moveTeamId}>
				<option value="" disabled>Team…</option>
				{#each data.teams as team (team.id)}
					<option value={team.id}
						>{team.name} ({categoryName(team.category) || 'no category'})</option
					>
				{/each}
			</select>
			<select class="select select-bordered select-sm" name="category" bind:value={moveCategory}>
				<option value="" disabled>New category…</option>
				{#each allCategories as category (category.key)}
					<option value={category.key}>{category.name}</option>
				{/each}
			</select>
			<button
				class="btn btn-sm btn-warning"
				disabled={!moveTeamId || !moveCategory}
				onclick={confirmSubmit(
					`Move ${data.teams.find((t) => t.id === moveTeamId)?.name} to ${categoryName(moveCategory)}? Its ratings will be removed.`
				)}>Move team</button
			>
		</form>
	</section>

	<!-- Shortcuts -->
	<section class="section">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<a href="/presentations" class="panel shortcut">
				<h3>View Presentations</h3>
				<p>Browse submissions by category</p>
			</a>
			<a href="/ranking" class="panel shortcut">
				<h3>View Rankings</h3>
				<p>Live ranking of every category</p>
			</a>
			<a href="/admin/system-info" class="panel shortcut">
				<h3>System Info</h3>
				<p>View system information</p>
			</a>
		</div>
	</section>
</div>

<style>
	.dashboard-container {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	.section {
		margin-top: 2rem;
	}

	.section-header {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.5rem;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.section-header p {
		color: rgba(255, 255, 255, 0.7);
	}

	.panel {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-top: 1rem;
	}

	.checkin-panel {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 1rem;
	}

	.checkin-panel b {
		margin-right: 0.5rem;
	}

	.shortcut {
		display: block;
		text-decoration: none;
		transition: border-color 0.15s ease;
	}

	.shortcut:hover {
		border-color: rgba(127, 123, 255, 0.6);
	}

	.shortcut h3 {
		font-weight: 700;
	}

	.shortcut p {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
