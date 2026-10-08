<script lang="ts">
	import TeamSection from '$lib/components/TeamSection.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import { invalidateAll } from '$app/navigation';
	import { matchesTeam } from '$lib/utils/teamSearch';

	let { data } = $props();
	let teams = $derived(data.teams);

	let showConfirmationModal = $state(false);
	let confirmationError = $state('');
	let filter = $state<'all' | 'todo' | 'done'>('all');
	let search = $state('');

	// "rated/total" per category, ✓ once confirmed
	let badges = $derived(
		Object.fromEntries(
			Object.entries(
				data.progress as Record<string, { rated: number; total: number; confirmed: boolean }>
			).map(([key, p]) => [key, p.confirmed ? `✓ ${p.rated}/${p.total}` : `${p.rated}/${p.total}`])
		)
	);

	let ratedCount = $derived(teams.filter((team) => team.isRatedByCurrentJury).length);
	let allTeamsRated = $derived(teams.length > 0 && ratedCount === teams.length);
	let progressPercent = $derived(teams.length ? Math.round((ratedCount / teams.length) * 100) : 0);
	let visibleTeams = $derived(
		(filter === 'todo'
			? teams.filter((team) => !team.isRatedByCurrentJury)
			: filter === 'done'
				? teams.filter((team) => team.isRatedByCurrentJury)
				: teams
		).filter((team) => matchesTeam(search, team.name, team.order))
	);

	async function handleConfirmation(confirmed: boolean) {
		confirmationError = '';
		try {
			const response = await fetch('/api/jury/confirm-grading', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category: data.category, confirmed })
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok || result.success === false) {
				confirmationError = result.message || 'Could not update the confirmation.';
				return;
			}
			showConfirmationModal = false;
			await invalidateAll();
		} catch (error) {
			console.error('Error updating confirmation:', error);
			confirmationError = 'Could not update the confirmation.';
		}
	}
</script>

{#if !data.category}
	<div class="alert alert-info">
		You are not assigned to any category yet. Ask the organizers to assign you.
	</div>
{:else}
	<CategoryTabs keys={data.categories} selected={data.category} {badges} />

	<div class="stage-banner" class:final={data.stage === 'final'}>
		{#if data.stage === 'final'}
			<b>Final</b>
			<span>
				Rate the finalists' stage presentations. You can also adjust your earlier scores.
			</span>
		{:else}
			<b>Preliminary round</b>
			<span>
				Rate every team from its presentation (PDF) and demo video. The best teams go to the final.
			</span>
		{/if}
	</div>

	<div class="jury-progress">
		<div class="flex flex-wrap items-center justify-between gap-2 mb-2">
			<span class="font-semibold">You rated {ratedCount} of {teams.length} teams</span>
			<div class="join">
				<button
					class="btn btn-sm join-item"
					class:btn-active={filter === 'all'}
					onclick={() => (filter = 'all')}>All ({teams.length})</button
				>
				<button
					class="btn btn-sm join-item"
					class:btn-active={filter === 'todo'}
					onclick={() => (filter = 'todo')}>Not rated ({teams.length - ratedCount})</button
				>
				<button
					class="btn btn-sm join-item"
					class:btn-active={filter === 'done'}
					onclick={() => (filter = 'done')}>Rated ({ratedCount})</button
				>
			</div>
		</div>
		<progress class="progress progress-success w-full" value={progressPercent} max="100"></progress>
		<input
			type="search"
			class="input input-bordered input-sm w-full mt-3"
			placeholder="Find a team: name or number, e.g. 7"
			bind:value={search}
			aria-label="Find a team"
		/>
		{#if search && visibleTeams.length === 0}
			<p class="text-sm text-base-content/60 mt-2">No team matches “{search}”.</p>
		{/if}
	</div>

	{#if data.published}
		<div class="confirmation-top-section confirmed">
			<div class="confirmation-banner confirmed">
				<h3>Results of this category are published</h3>
				<p>Ratings are locked and can no longer be changed.</p>
			</div>
		</div>
	{:else if data.confirmed}
		<div class="confirmation-top-section confirmed">
			<div class="confirmation-banner confirmed">
				<h3>Your ratings are confirmed</h3>
				<p>
					Organizers will publish this category once all of its jurors confirm. Changing any rating
					withdraws your confirmation.
				</p>
			</div>
		</div>
	{:else if allTeamsRated}
		<div class="confirmation-top-section">
			<div class="confirmation-banner">
				<h3>You've rated all teams!</h3>
				<p>Confirm your ratings as final so the organizers can publish the results.</p>
				<button class="btn btn-confirm" onclick={() => (showConfirmationModal = true)}>
					Confirm My Ratings
				</button>
			</div>
		</div>
	{/if}

	<!-- Confirmation Modal -->
	{#if showConfirmationModal}
		<div class="modal-overlay">
			<div class="modal-content">
				<h3>Confirm Your Ratings</h3>
				<p>You have rated all teams. Do you confirm these ratings as final?</p>
				{#if confirmationError}
					<p class="text-error">{confirmationError}</p>
				{/if}
				<div class="modal-buttons">
					<button class="btn btn-primary" onclick={() => handleConfirmation(true)}>
						Yes, Confirm
					</button>
					<button class="btn btn-secondary" onclick={() => (showConfirmationModal = false)}>
						Not Yet
					</button>
				</div>
			</div>
		</div>
	{/if}

	<TeamSection teams={visibleTeams} locked={data.published} />
{/if}

<style>
	.stage-banner {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: baseline;
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(127, 123, 255, 0.1);
		border: 1px solid rgba(127, 123, 255, 0.4);
	}

	.stage-banner.final {
		background: rgba(247, 166, 84, 0.1);
		border-color: rgba(247, 166, 84, 0.45);
	}

	.jury-progress {
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background: #1e1f22;
		color: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		text-align: center;
		min-width: 300px;
		border: 1px solid #2c2e33;
	}

	.modal-content h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.25rem;
		color: #f0f0f0;
	}

	.modal-content p {
		margin-bottom: 1.5rem;
		color: #aaa;
	}

	.modal-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background-color: #565966;
	}

	.confirmation-top-section {
		position: sticky;
		top: 0;
		z-index: 100;
		padding: 1rem;
		background-color: #1e1f22;
		border-bottom: 1px solid #2c2e33;
	}

	.confirmation-top-section.confirmed {
		background-color: #1a2d1f;
	}

	.confirmation-banner {
		max-width: 800px;
		margin: 0 auto;
		padding: 0.75rem;
		background-color: #36623d;
		border-radius: 0.5rem;
		border: 1px solid #36c399;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.confirmation-banner.confirmed {
		background-color: #2d5a27;
		border-color: #4ade80;
	}

	.confirmation-banner h3 {
		margin: 0;
		color: #a3f0b5;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.confirmation-banner.confirmed h3 {
		color: #a7f3d0;
	}

	.confirmation-banner p {
		margin: 0;
		color: #e0e0e0;
		font-size: 0.9rem;
	}

	.confirmation-banner.confirmed p {
		color: #d1fae5;
	}

	.btn-confirm {
		background-color: #36c399;
		color: white;
		padding: 0.5rem 1.5rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.btn-confirm:hover {
		background-color: #2d9e7c;
	}
</style>
