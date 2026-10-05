<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let forcePublish = $state(false);

	const juries = $derived(
		(() => {
			if (!data?.users || !Array.isArray(data.users)) {
				return [];
			}
			// Only jury ratings count, so admins aren't listed as jury members
			return data.users.filter((user) => user.role == 'jury');
		})()
	);

	const totalTeams = $derived(data?.teams?.length || 0);
	const totalJuries = $derived(juries.length);
	const totalRatings = $derived(data?.ratings?.length || 0);
	const confirmedRatings = $derived(
		juries.filter((jury) => jury.confirmedRating === true || jury.confirmedRating === 'true').length
	);
	const pendingRatings = $derived(totalJuries - confirmedRatings);

	// Calculate completion percentage
	const completionPercentage = $derived(
		totalJuries > 0 ? Math.round((confirmedRatings / totalJuries) * 100) : 0
	);

	let icon = IconNames.Stats;
	let text = 'Admin Dashboard';
</script>

<div class="dashboard-container">
	<HeaderText {icon} {text} />

	<!-- Stats Overview -->
	<div class="stats-grid">
		<div class="stat-card bg-base-200 rounded-lg p-4 shadow">
			<div class="stat-title text-base-content/70">Total Teams</div>
			<div class="stat-value text-3xl font-bold text-primary">{totalTeams}</div>
			<div class="stat-desc text-base-content/50">Registered teams</div>
		</div>

		<div class="stat-card bg-base-200 rounded-lg p-4 shadow">
			<div class="stat-title text-base-content/70">Total Juries</div>
			<div class="stat-value text-3xl font-bold text-secondary">{totalJuries}</div>
			<div class="stat-desc text-base-content/50">Active jury members</div>
		</div>

		<div class="stat-card bg-base-200 rounded-lg p-4 shadow">
			<div class="stat-title text-base-content/70">Total Ratings</div>
			<div class="stat-value text-3xl font-bold text-accent">{totalRatings}</div>
			<div class="stat-desc text-base-content/50">Submitted ratings</div>
		</div>

		<div class="stat-card bg-base-200 rounded-lg p-4 shadow">
			<div class="stat-title text-base-content/70">Rating Completion</div>
			<div class="stat-value text-3xl font-bold text-success">{completionPercentage}%</div>
			<div class="stat-desc text-base-content/50">
				<span class="text-success">{confirmedRatings}</span> of
				<span class="text-primary"> {totalJuries}</span> juries confirmed
			</div>
		</div>
	</div>

	<!-- Results Publishing -->
	<div class="results-section mt-8">
		<div class="section-header">
			<h2 class="text-2xl font-bold mb-2">Results</h2>
			<p class="text-base-content/70">
				Participants see the ranking, scores and feedback only after you publish them.
			</p>
		</div>

		{#if form?.message}
			<div class="alert mt-4 {form.success ? 'alert-success' : 'alert-error'}">
				<span>{form.message}</span>
			</div>
		{/if}

		<div class="bg-base-200 rounded-lg p-4 mt-4 shadow">
			{#if data.resultsState.published}
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<span class="badge badge-success">Published</span>
						{#if data.resultsState.publishedAt}
							<span class="text-sm text-base-content/70 ml-2">
								since {new Date(data.resultsState.publishedAt).toLocaleString()}
							</span>
						{/if}
						<p class="text-sm text-base-content/70 mt-2">Ratings are locked for the jury.</p>
					</div>
					<form method="POST" action="?/unpublishResults" use:enhance>
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						<button
							class="btn btn-outline btn-warning"
							onclick={(e) => {
								if (!confirm('Hide the results from participants again?')) e.preventDefault();
							}}>Unpublish</button
						>
					</form>
				</div>
			{:else}
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<span class="badge badge-ghost">Not published</span>
						<p class="text-sm mt-2">
							{data.progress.confirmedCount} of {data.progress.juries.length} jury members confirmed
							· {data.progress.totalTeams} teams to rate
						</p>
						<ul class="text-sm mt-2 space-y-1">
							{#each data.progress.juries as jury (jury.id)}
								<li>
									<span class={jury.confirmed ? 'text-success' : 'text-warning'}>
										{jury.confirmed ? '✓' : '…'}
									</span>
									{jury.name}: rated {jury.ratedTeams}/{data.progress.totalTeams}{jury.confirmed
										? ', confirmed'
										: ''}
								</li>
							{/each}
						</ul>
					</div>
					<form method="POST" action="?/publishResults" use:enhance class="flex flex-col gap-2">
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						{#if !data.progress.readyToPublish}
							<label class="label cursor-pointer gap-2 justify-start">
								<input
									type="checkbox"
									class="checkbox checkbox-sm checkbox-warning"
									name="force"
									value="true"
									bind:checked={forcePublish}
								/>
								<span class="label-text text-sm">Publish anyway (not everyone is done)</span>
							</label>
						{/if}
						<button
							class="btn btn-primary"
							disabled={!data.progress.readyToPublish && !forcePublish}
							onclick={(e) => {
								if (!confirm('Publish the results to all participants now?')) e.preventDefault();
							}}>Publish results</button
						>
					</form>
				</div>
			{/if}
		</div>
	</div>

	<!-- Submissions Overview -->
	<div class="submissions-section mt-8">
		<div class="section-header">
			<h2 class="text-2xl font-bold mb-2">Submissions</h2>
			<p class="text-base-content/70">
				{data.submissionOverview.filter((t) => t.missing.length === 0).length} of
				{data.submissionOverview.length} teams complete. Incomplete teams are listed first.
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
						<th>Last change</th>
					</tr>
				</thead>
				<tbody>
					{#each data.submissionOverview as team (team.teamId)}
						<tr class={team.missing.length ? 'text-warning' : ''}>
							<td class="font-medium">{team.teamName}</td>
							<td>{team.presentation ? '✓' : '✗'}</td>
							<td>{team.repo ? '✓' : '✗'}</td>
							<td>{team.video ? '✓' : '✗'}</td>
							<td class="text-base-content/70">
								{team.lastUpdated ? new Date(team.lastUpdated).toLocaleString() : 'nothing yet'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Rating Confirmation Section -->
	<div class="rating-confirmation-section mt-8">
		<div class="section-header">
			<h2 class="text-2xl font-bold mb-2">Rating Confirmation</h2>
			<p class="text-base-content/70">
				Manage jury rating confirmations. All juries must confirm their ratings for final rankings to be published.
			</p>
		</div>

		<div class="progress-container mt-4 mb-6">
			<div class="flex justify-between items-center mb-2">
				<span class="text-sm font-medium">Rating confirmation progress</span>
				<span class="text-sm font-medium">{completionPercentage}%</span>
			</div>
			<div class="w-full bg-base-300 rounded-full h-2.5">
				<div
					class="bg-success h-2.5 rounded-full transition-all duration-500 ease-out"
					style="width: {completionPercentage}%"
				></div>
			</div>
		</div>

		<!-- Juries List -->
		<div class="juries-list">
			{#if juries.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each juries as jury (jury.id)}
						<div class="jury-card bg-base-200 rounded-lg p-4 shadow">
							<div class="jury-header flex justify-between items-start">
								<div>
									<h3 class="font-bold text-lg">{jury.name || jury.email}</h3>
									<p class="text-sm text-base-content/60">ID: {jury.id}</p>
								</div>
								<div class="badge badge-outline">
									{jury.role === 'admin' ? 'Admin' : 'Jury'}
								</div>
							</div>

							<div class="jury-status mt-4">
								<div class="flex items-center gap-2">
									{#if jury.confirmedRating === true || jury.confirmedRating === 'true'}
										<div class="badge badge-success gap-2">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											Confirmed
										</div>
										<span class="text-sm text-success">Rating confirmed</span>
									{:else}
										<div class="badge badge-warning gap-2">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
											</svg>
											Pending
										</div>
										<span class="text-sm text-warning">Awaiting confirmation</span>
									{/if}
								</div>
							</div>

							{#if jury.confirmedRating !== true && jury.confirmedRating !== 'true'}
								<form method="POST" action="?/updateConfirmedRating" class="mt-4">
									<input type="hidden" name="user_id" value={jury.id} />
									<input type="hidden" name="confirmed_rating" value="true" />
									<input type="hidden" name="csrf_token" value={data.csrfToken} />
									<button
										type="submit"
										class="btn btn-primary btn-sm w-full"
										onclick={(e) => {
											if (!confirm(`Confirm rating for ${jury.name || jury.email}?`)) {
												e.preventDefault();
											}
										}}
									>
										Confirm Rating
									</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="alert alert-info">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span>No jury members found.</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Additional Admin Actions -->
	<div class="admin-actions-section mt-8">
		<div class="section-header">
			<h2 class="text-2xl font-bold mb-2">Admin Actions</h2>
			<p class="text-base-content/70">Quick access to administrative functions</p>
		</div>

		<div class="admin-actions-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
			<a href="/presentations" class="card bg-base-200 hover:bg-base-300 transition-colors duration-200 rounded-lg p-4 shadow">
				<div class="card-body items-center text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<h3 class="card-title">View Presentations</h3>
					<p class="text-sm text-base-content/60">Browse all team presentations</p>
				</div>
			</a>

			<a href="/ranking" class="card bg-base-200 hover:bg-base-300 transition-colors duration-200 rounded-lg p-4 shadow">
				<div class="card-body items-center text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<h3 class="card-title">View Rankings</h3>
					<p class="text-sm text-base-content/60">See current team rankings</p>
				</div>
			</a>


			<a href="/admin/system-info" class="card bg-base-200 hover:bg-base-300 transition-colors duration-200 rounded-lg p-4 shadow">
				<div class="card-body items-center text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<h3 class="card-title">System Info</h3>
					<p class="text-sm text-base-content/60">View system information</p>
				</div>
			</a>
		</div>
	</div>
</div>

<style>
	.dashboard-container {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
	}

	.section-header {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.5rem;
	}

	.progress-container {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.jury-card {
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.jury-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
	}

	.admin-actions-grid {
		gap: 1rem;
	}

	.card {
		transition: all 0.3s ease;
	}

	.card:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.dashboard-container {
			padding: 1rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.admin-actions-grid {
			grid-template-columns: 1fr;
		}

		.progress-container {
			padding: 0.75rem;
		}
	}
</style>
