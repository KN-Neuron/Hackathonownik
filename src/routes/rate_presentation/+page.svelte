<script lang="ts">
	import TeamSection from '$lib/components/TeamSection.svelte';
	import { onMount } from 'svelte';

	export let data;
	let { teams, currentJuryConfirmed } = data;

	let showConfirmationModal = false;
	let allTeamsRated = false;
	let juryConfirmed = currentJuryConfirmed; // Initialize with the server value
	let showTopConfirmationButton = false;

	// Check if all teams have been rated by the current jury
	$: {
		const ratedTeams = teams.filter(team => team.isRatedByCurrentJury);
		allTeamsRated = ratedTeams.length > 0 && ratedTeams.length === teams.length;

		// If all teams are rated but jury hasn't confirmed, show top button
		if (allTeamsRated && !juryConfirmed) {
			showTopConfirmationButton = true;
		}
	}

	async function fetchConfirmationStatus() {
		try {
			const response = await fetch('/api/jury/confirm-grading');
			const result = await response.json();
			juryConfirmed = result.confirmed;

			// If jury has confirmed, hide the top button
			if (juryConfirmed) {
				showTopConfirmationButton = false;
			}
		} catch (error) {
			console.error('Error fetching confirmation status:', error);
		}
	}

	async function handleConfirmation(confirmed: boolean) {
		try {
			await fetch('/api/jury/confirm-grading', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ confirmed })
			});

			juryConfirmed = confirmed;
			showConfirmationModal = false;
			showTopConfirmationButton = false; // Hide the button after confirmation
		} catch (error) {
			console.error('Error updating confirmation:', error);
		}
	}

	async function openConfirmationModal() {
		// Always open the confirmation modal when button is clicked
		showConfirmationModal = true;
	}

	onMount(() => {
		// Server already provides initial confirmation status, but we keep the fetch for real-time updates
		fetchConfirmationStatus();
	});
</script>

<!-- Top confirmation section -->
{#if showTopConfirmationButton}
	<div class="confirmation-top-section">
		<div class="confirmation-banner">
			<h3>You've rated all teams!</h3>
			<p>Remember to confirm your ratings so they become visible to participants.</p>
			<button
				class="btn btn-confirm"
				on:click={openConfirmationModal}
			>
				Confirm My Ratings
			</button>
		</div>
	</div>
{:else if juryConfirmed}
	<div class="confirmation-top-section confirmed">
		<div class="confirmation-banner confirmed">
			<h3>All Ratings Confirmed</h3>
			<p>Your ratings have been confirmed and are visible to participants.</p>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmationModal}
	<div class="modal-overlay">
		<div class="modal-content">
			<h3>Confirm Your Ratings</h3>
			<p>You have rated all teams. Do you confirm these ratings as final?</p>
			<div class="modal-buttons">
				<button
					class="btn btn-primary"
					on:click={() => handleConfirmation(true)}
				>
					Yes, Confirm
				</button>
				<button
					class="btn btn-secondary"
					on:click={() => handleConfirmation(false)}
				>
					No, Not Yet
				</button>
			</div>
		</div>
	</div>
{/if}

<TeamSection {teams} />

<style>
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
