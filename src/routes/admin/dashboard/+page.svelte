<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data } = $props();
	console.log(data);
	console.log(data.users);
	console.log(data.ratings);

	const juries = $derived(
		(() => {
			if (!data?.users || !Array.isArray(data.users)) {
				return [];
			}
			return data.users.filter((user) => user.role == 'jury' || user.role == 'admin');
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
										on:click={(e) => {
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

		<div class="admin-actions-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
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

			<a href="/upload" class="card bg-base-200 hover:bg-base-300 transition-colors duration-200 rounded-lg p-4 shadow">
				<div class="card-body items-center text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					<h3 class="card-title">Upload Files</h3>
					<p class="text-sm text-base-content/60">Manage file uploads</p>
				</div>
			</a>

			<a href="/info" class="card bg-base-200 hover:bg-base-300 transition-colors duration-200 rounded-lg p-4 shadow">
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
