<script lang="ts">
	import { enhance } from '$app/forms';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import { IconNames } from '$lib/utils/utils';
	import type { EventCategory } from '$lib/types';

	let { data, form } = $props();
	let forcePublish = $state(false);
	let forceFinal = $state(false);

	// Presentation order being edited (reset when the category or the saved order changes)
	type OrderItem = { teamId: string; teamName: string; finalist: boolean };
	let order = $state<OrderItem[]>([]);
	$effect(() => {
		order = [...(data.presentationOrder as OrderItem[])];
	});
	let orderChanged = $derived(
		order.map((t) => t.teamId).join() !==
			(data.presentationOrder as OrderItem[]).map((t) => t.teamId).join()
	);
	function move(index: number, by: number) {
		const target = index + by;
		if (target < 0 || target >= order.length) return;
		const next = [...order];
		[next[index], next[target]] = [next[target], next[index]];
		order = next;
	}
	function shuffle() {
		const next = [...order];
		for (let i = next.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[next[i], next[j]] = [next[j], next[i]];
		}
		order = next;
	}
	// Login details of a juror just added or given a new password
	let credentials = $derived(
		(form as { credentials?: { email: string; password: string } } | null)?.credentials
	);

	// Unsaved juror ↔ category changes, per juror
	let juryDraft = $state<Record<string, string[]>>({});
	const sameCategories = (a: string[], b: string[]) =>
		a.length === b.length && a.every((key) => b.includes(key));
	function toggleJuryCategory(juryId: string, current: string[], key: string, event: Event) {
		const checked = (event.currentTarget as HTMLInputElement).checked;
		juryDraft[juryId] = checked ? [...current, key] : current.filter((k) => k !== key);
	}
	// Finalists to pick: the top N of the preliminary ranking, reset when the category changes
	let selectedFinalists = $state<string[]>([]);
	let finalistsFor = '';
	$effect(() => {
		if (data.category !== finalistsFor) {
			finalistsFor = data.category;
			selectedFinalists = data.ranking.rankings
				.slice(0, data.finalistsLimit)
				.map((r: { teamId: string }) => r.teamId);
		}
	});
	// Teams sharing the place of the last finalist spot, when that place spills over the limit
	let cutoffTie = $derived.by(() => {
		const list = data.ranking.rankings as { team: string; rank: number }[];
		const last = list[data.finalistsLimit - 1];
		if (!last || list.length <= data.finalistsLimit || list[data.finalistsLimit].rank !== last.rank)
			return [];
		return list.filter((t) => t.rank === last.rank).map((t) => t.team);
	});
	const maxScore = (criteria: { maxScore: number }[]) =>
		criteria.reduce((sum, c) => sum + c.maxScore, 0);
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

	{#if credentials}
		<!-- Shown once: the password isn't stored anywhere the organizers can read it again -->
		<div class="panel credentials">
			<b>Login details – give them to the juror now, they won't be shown again:</b>
			<code>E-mail: {credentials.email}<br />Password: {credentials.password}</code>
			<button
				class="btn btn-xs btn-outline"
				onclick={() =>
					navigator.clipboard.writeText(
						`E-mail: ${credentials.email}\nPassword: ${credentials.password}\nLog in at ${location.origin}/login`
					)}>Copy</button
			>
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
		<!-- Judging of the selected category (rules §8: preliminary round → final → results) -->
		<section class="section">
			<div class="section-header">
				<h2>Judging: {current.name}</h2>
				<ol class="stage-steps">
					<li class:active={data.stage === 'preliminary'} class:done={data.stage === 'final'}>
						1. Preliminary round
					</li>
					<li class:active={data.stage === 'final' && !data.published} class:done={data.published}>
						2. Final ({data.finalists.length || data.finalistsLimit} teams)
					</li>
					<li class:active={data.published}>3. Results published</li>
				</ol>
			</div>

			<div class="panel">
				<p class="text-sm">
					{#if data.stage === 'preliminary'}
						Jurors rate every team from its PDF and demo video.
					{:else}
						Jurors rate the finalists' stage presentations.
					{/if}
					{progress.confirmedCount} of {progress.juries.length} jurors confirmed ·
					{progress.totalTeams} teams to rate
				</p>
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

			{#if data.stage === 'preliminary'}
				<!-- Step 1 → 2: pick the finalists -->
				<form method="POST" action="?/startFinal" use:enhance class="panel">
					<input type="hidden" name="csrf_token" value={data.csrfToken} />
					<input type="hidden" name="category" value={data.category} />
					<h3 class="panel-title">
						Preliminary ranking – pick up to {data.finalistsLimit} finalists
					</h3>
					<p class="text-sm text-base-content/70 mb-2">
						The top {data.finalistsLimit} are preselected; the jury decides who goes to the final.
					</p>
					<div class="overflow-x-auto">
						<table class="table table-sm w-full">
							<thead>
								<tr>
									<th>Final</th>
									<th>Place</th>
									<th>Team</th>
									<th>Score</th>
									<th>Ratings</th>
								</tr>
							</thead>
							<tbody>
								{#each data.ranking.rankings as team (team.teamId)}
									<tr>
										<td>
											<input
												type="checkbox"
												class="checkbox checkbox-sm"
												name="finalists"
												value={team.teamId}
												bind:group={selectedFinalists}
												aria-label="Finalist: {team.team}"
											/>
										</td>
										<td>{team.rank}</td>
										<td class="font-medium">{team.team}</td>
										<td>{team.finalGrade.toFixed(2)} / {maxScore(data.ranking.criteria)}</td>
										<td>{team.ratingCount}/{data.ranking.totalJuries}</td>
									</tr>
								{:else}
									<tr
										><td colspan="5" class="text-center text-base-content/60">No submissions yet</td
										></tr
									>
								{/each}
							</tbody>
						</table>
					</div>
					{#if cutoffTie.length > 1}
						<div class="tie-box">
							<b>Tie at the finalist cut-off.</b>
							<span class="text-sm">
								{cutoffTie.join(', ')} share place {data.ranking.rankings[data.finalistsLimit - 1]
									.rank}. The jury decides which of them go to the final.
							</span>
						</div>
					{/if}
					<div class="flex flex-wrap items-center gap-3 mt-3">
						{#if !progress.readyToPublish}
							<label class="label cursor-pointer gap-2">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-warning"
									name="force"
									value="true"
									bind:checked={forceFinal}
								/>
								<span class="label-text text-sm">Start anyway (not every juror is done)</span>
							</label>
						{/if}
						<button
							class="btn btn-primary"
							disabled={selectedFinalists.length === 0 ||
								selectedFinalists.length > data.finalistsLimit ||
								(!progress.readyToPublish && !forceFinal)}
							onclick={confirmSubmit(
								`Start the ${current.name} final with ${selectedFinalists.length} teams?`
							)}
						>
							Start the final with {selectedFinalists.length} teams
						</button>
						{#if selectedFinalists.length > data.finalistsLimit}
							<span class="text-error text-sm">At most {data.finalistsLimit} teams.</span>
						{/if}
					</div>
				</form>
			{:else}
				<!-- Step 2 → 3: final ranking, tie-break, publishing -->
				<div class="panel">
					<h3 class="panel-title">Final ranking</h3>
					<div class="overflow-x-auto">
						<table class="table table-sm w-full">
							<thead>
								<tr>
									<th>Place</th>
									<th>Team</th>
									<th>Score</th>
									<th>Ratings</th>
								</tr>
							</thead>
							<tbody>
								{#each data.ranking.rankings as team (team.teamId)}
									<tr>
										<td>{team.rank}{team.wonTieBreak ? ' (tie-break)' : ''}</td>
										<td class="font-medium">{team.team}</td>
										<td>{team.finalGrade.toFixed(2)} / {maxScore(data.ranking.criteria)}</td>
										<td>{team.ratingCount}/{data.ranking.totalJuries}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if data.ranking.tie.length > 0}
						<form method="POST" action="?/setTieWinner" use:enhance class="tie-box">
							<input type="hidden" name="csrf_token" value={data.csrfToken} />
							<input type="hidden" name="category" value={data.category} />
							<b>Tie for first place.</b>
							<span class="text-sm">Rules §8: the jury decides by vote. Record the winner:</span>
							<div class="flex flex-wrap gap-2 mt-2">
								{#each data.ranking.tie as team (team.teamId)}
									<button class="btn btn-sm btn-warning" name="team_id" value={team.teamId}
										>{team.team} won the vote</button
									>
								{/each}
							</div>
						</form>
					{/if}

					<div class="flex flex-wrap items-center justify-between gap-3 mt-4">
						{#if data.published}
							<span>
								<span class="badge badge-success">Published</span>
								{#if data.publishedAt}
									<span class="text-sm text-base-content/70 ml-2">
										since {new Date(data.publishedAt).toLocaleString()}
									</span>
								{/if}
							</span>
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
							<form method="POST" action="?/backToPreliminary" use:enhance>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="category" value={data.category} />
								<button
									class="btn btn-sm btn-ghost"
									onclick={confirmSubmit(
										'Go back to the preliminary round? The finalist list is cleared.'
									)}>Back to the preliminary round</button
								>
							</form>
							<form
								method="POST"
								action="?/publishCategory"
								use:enhance
								class="flex flex-col gap-2"
							>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="category" value={data.category} />
								{#if !progress.readyToPublish || data.ranking.tie.length > 0}
									<label class="label cursor-pointer gap-2 justify-start">
										<input
											type="checkbox"
											class="checkbox checkbox-sm checkbox-warning"
											name="force"
											value="true"
											bind:checked={forcePublish}
										/>
										<span class="label-text text-sm">
											{data.ranking.tie.length > 0
												? 'Publish without a tie-break'
												: 'Publish anyway (not every juror is done)'}
										</span>
									</label>
								{/if}
								<button
									class="btn btn-primary"
									disabled={(!progress.readyToPublish || data.ranking.tie.length > 0) &&
										!forcePublish}
									onclick={confirmSubmit(
										`Publish ${current.name} results to all participants now?`
									)}>Publish {current.name}</button
								>
							</form>
						{/if}
					</div>
					<a class="link text-sm mt-3 inline-block" href="/admin/protocol?category={data.category}"
						>Print the jury protocol</a
					>
				</div>
			{/if}
		</section>

		<!-- Presentation order of the selected category -->
		<section class="section">
			<div class="section-header">
				<h2>Presentation order: {current.name}</h2>
				<p>
					Jurors see the teams in this order, numbered. In the final only the finalists, in the same
					order.
				</p>
			</div>
			<form
				method="POST"
				action="?/setOrder"
				class="panel"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false });
					}}
			>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="category" value={data.category} />
				{#each order as team (team.teamId)}
					<input type="hidden" name="order" value={team.teamId} />
				{/each}
				<div class="flex flex-wrap gap-2 mb-3">
					<button type="button" class="btn btn-xs btn-outline" onclick={shuffle}>Random draw</button
					>
					<button
						type="button"
						class="btn btn-xs btn-outline"
						onclick={() =>
							(order = [...order].sort((a, b) => a.teamName.localeCompare(b.teamName)))}>A–Z</button
					>
					<button
						class="btn btn-xs {orderChanged ? 'btn-primary' : 'btn-ghost'}"
						disabled={!orderChanged}
					>
						{orderChanged ? 'Save order' : 'Saved'}
					</button>
				</div>
				<ol class="order-list">
					{#each order as team, i (team.teamId)}
						<li>
							<span class="order-index">#{i + 1}</span>
							<span class="flex-1">
								{team.teamName}
								{#if data.stage === 'final' && team.finalist}<span
										class="badge badge-warning badge-xs ml-1">final</span
									>{/if}
							</span>
							<button
								type="button"
								class="btn btn-xs btn-ghost"
								disabled={i === 0}
								onclick={() => move(i, -1)}
								aria-label="Move {team.teamName} up">↑</button
							>
							<button
								type="button"
								class="btn btn-xs btn-ghost"
								disabled={i === order.length - 1}
								onclick={() => move(i, 1)}
								aria-label="Move {team.teamName} down">↓</button
							>
						</li>
					{:else}
						<li class="text-base-content/60">No submissions yet</li>
					{/each}
				</ol>
			</form>
		</section>

		<!-- Did the jury open the material? -->
		<section class="section">
			<div class="section-header">
				<h2>Jury review: {current.name}</h2>
				<p>
					What each juror opened: <b>P</b> presentation, <b>V</b> video, <b>F</b> final
					presentation.
					<a class="link ml-2" href="/present?category={data.category}">Open the presenter mode →</a
					>
				</p>
			</div>
			<div class="overflow-x-auto bg-base-200 rounded-lg mt-4">
				<table class="table table-sm w-full">
					<thead>
						<tr>
							<th>Team</th>
							{#each progress.juries as jury (jury.id)}<th>{jury.name}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each order as team (team.teamId)}
							<tr>
								<td class="font-medium">{team.teamName}</td>
								{#each progress.juries as jury (jury.id)}
									{@const items = data.views[team.teamId]?.[jury.id] ?? []}
									<td class="views">
										<span class:yes={items.includes('presentation')}>P</span>
										<span class:yes={items.includes('video')}>V</span>
										{#if data.stage === 'final'}
											<span class:yes={items.includes('final_presentation')}>F</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
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
							<th title="Rules: 3–4 people">People</th>
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
								<td class={team.members < 3 || team.members > 4 ? 'text-error' : ''}
									>{team.members}</td
								>
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
							<tr><td colspan="7" class="text-center text-base-content/60">No teams yet</td></tr>
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
						{@const draft = juryDraft[jury.id] ?? jury.categories}
						{@const changed = !sameCategories(draft, jury.categories)}
						<tr>
							<td>
								<span class="font-medium">{jury.name}</span>
								<span class="block text-xs text-base-content/60">{jury.email}</span>
							</td>
							{#each allCategories as category (category.key)}
								<td>
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={draft.includes(category.key)}
										onchange={(e) => toggleJuryCategory(jury.id, draft, category.key, e)}
										aria-label="{jury.name}: {category.name}"
									/>
								</td>
							{/each}
							<td>
								<form
									method="POST"
									action="?/setJuryCategories"
									use:enhance={() =>
										async ({ result, update }) => {
											// Keep the checkboxes as they are; the saved data comes back from the server
											await update({ reset: false });
											if (result.type === 'success') delete juryDraft[jury.id];
										}}
								>
									<input type="hidden" name="csrf_token" value={data.csrfToken} />
									<input type="hidden" name="jury_id" value={jury.id} />
									{#each draft as key (key)}
										<input type="hidden" name="categories" value={key} />
									{/each}
									<button
										class="btn btn-xs {changed ? 'btn-primary' : 'btn-ghost'}"
										disabled={!changed}
									>
										{changed ? 'Save' : 'Saved'}
									</button>
								</form>
								<form method="POST" action="?/resetJuryPassword" use:enhance class="inline">
									<input type="hidden" name="csrf_token" value={data.csrfToken} />
									<input type="hidden" name="jury_id" value={jury.id} />
									<button
										class="btn btn-xs btn-ghost"
										onclick={confirmSubmit(`Set a new password for ${jury.name}?`)}
										>New password</button
									>
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

		<form method="POST" action="?/addJury" use:enhance class="panel add-jury">
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<h3 class="panel-title">Add a juror</h3>
			<div class="flex flex-wrap gap-2 items-center">
				<input class="input input-bordered input-sm" name="name" placeholder="Full name" required />
				<input
					class="input input-bordered input-sm"
					name="email"
					type="email"
					placeholder="E-mail"
					required
				/>
				{#each allCategories as category (category.key)}
					<label class="label cursor-pointer gap-1">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							name="categories"
							value={category.key}
						/>
						<span class="label-text text-sm" style="color: {category.color}">{category.name}</span>
					</label>
				{/each}
				<button class="btn btn-sm btn-primary">Add juror</button>
			</div>
			<p class="text-xs text-base-content/60 mt-2">
				A password is generated and shown once, so you can hand it to the juror.
			</p>
		</form>
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

	.stage-steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}

	.stage-steps li {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.55);
	}

	.stage-steps li.active {
		background: rgba(127, 123, 255, 0.25);
		color: #fff;
		font-weight: 600;
	}

	.stage-steps li.done {
		color: #36c399;
	}

	.panel-title {
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.tie-box {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: rgba(247, 166, 84, 0.1);
		border: 1px solid rgba(247, 166, 84, 0.45);
		display: flex;
		flex-direction: column;
	}

	.order-list {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.order-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0.4rem;
		border-radius: 0.375rem;
	}

	.order-list li:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.order-index {
		width: 2.5rem;
		color: rgba(255, 255, 255, 0.5);
		font-variant-numeric: tabular-nums;
	}

	.views span {
		margin-right: 0.35rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.2);
	}

	.views span.yes {
		color: #36c399;
	}

	.credentials {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		border-color: rgba(54, 195, 153, 0.5);
		margin: 0 0 1rem;
	}

	.credentials code {
		font-size: 1rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
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
