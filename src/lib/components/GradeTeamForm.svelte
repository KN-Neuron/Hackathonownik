<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	export let teamId: string;

	let innovation = 3;
	let usefulness = 3;
	let finalPresentation = 3;
	let implementation = 5; // Default to middle of 1-10 scale

	let comments = '';
	let error = '';
	let existingRating = null;
	let loading = true;

	// Scale constants
	const minScore = 1;
	const maxStandardScore = 5; // For innovation, usefulness, presentation
	const maxImplementationScore = 10;

	// Calculate total score
	$: totalScore = innovation + usefulness + finalPresentation + implementation;
	$: maxTotalScore = maxStandardScore * 3 + maxImplementationScore; // 25

	onMount(async () => {
		try {
			loading = true;
			const response = await fetch(`/api/ratings/check?teamId=${teamId}`);
			const data = await response.json();

			if (data.found) {
				existingRating = data.rating;
				innovation = existingRating.innovation;
				usefulness = existingRating.usefulness;
				finalPresentation = existingRating.finalPresentation;
				implementation = existingRating.implementation;
				comments = existingRating.comments || '';
			}
		} catch (err) {
			console.error('Error checking existing rating:', err);
		} finally {
			loading = false;
		}
	});
</script>

<form
	method="POST"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'redirect') {
				await invalidateAll();
				window.location.reload();
			}
		};
	}}
	class="rating-form"
>
	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading rating data...</p>
		</div>
	{:else}
		<h2 class="text-2xl font-bold mb-3">Project Grading</h2>
		<p class="text-gray-400 mb-6">Please grade this project based on the four criteria below</p>

		<div class="form-section">
			<label class="form-control">
				<div class="label">
					<span class="label-text">Project ID</span>
				</div>

				<input
					class="input input-bordered w-full"
					id="teamId"
					name="teamId"
					type="text"
					value={teamId}
					readonly
					required
				/>
			</label>
		</div>

		<!-- Innovation Rating -->
		<div class="form-section">
			<div class="label">
				<span class="label-text font-bold">Innovation (Innowacyjność)</span>
				<span class="label-text-alt">{innovation}/{maxStandardScore} points</span>
			</div>

			<input
				type="range"
				min={minScore}
				max={maxStandardScore}
				step="1"
				class="range range-primary"
				bind:value={innovation}
				name="innovation"
			/>

			<div class="w-full flex justify-between text-xs px-1 mt-1">
				{#each Array(maxStandardScore) as _, i}
					<span>{i + 1}</span>
				{/each}
			</div>
		</div>

		<!-- Usefulness Rating -->
		<div class="form-section">
			<div class="label">
				<span class="label-text font-bold">Usefulness (Użyteczność)</span>
				<span class="label-text-alt">{usefulness}/{maxStandardScore} points</span>
			</div>

			<input
				type="range"
				min={minScore}
				max={maxStandardScore}
				step="1"
				class="range range-primary"
				bind:value={usefulness}
				name="usefulness"
			/>

			<div class="w-full flex justify-between text-xs px-1 mt-1">
				{#each Array(maxStandardScore) as _, i}
					<span>{i + 1}</span>
				{/each}
			</div>
		</div>

		<!-- Final Presentation Rating -->
		<div class="form-section">
			<div class="label">
				<span class="label-text font-bold">Final Presentation (Prezentacja Końcowa)</span>
				<span class="label-text-alt">{finalPresentation}/{maxStandardScore} points</span>
			</div>

			<input
				type="range"
				min={minScore}
				max={maxStandardScore}
				step="1"
				class="range range-primary"
				bind:value={finalPresentation}
				name="finalPresentation"
			/>

			<div class="w-full flex justify-between text-xs px-1 mt-1">
				{#each Array(maxStandardScore) as _, i}
					<span>{i + 1}</span>
				{/each}
			</div>
		</div>

		<!-- Implementation Rating (1-10) -->
		<div class="form-section">
			<div class="label">
				<span class="label-text font-bold">Implementation Quality (Jakość Implementacji)</span>
				<span class="label-text-alt">{implementation}/{maxImplementationScore} points</span>
			</div>

			<input
				type="range"
				min={minScore}
				max={maxImplementationScore}
				step="1"
				class="range range-primary"
				bind:value={implementation}
				name="implementation"
			/>

			<div class="w-full flex justify-between text-xs px-1 mt-1">
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
				<span>5</span>
				<span>6</span>
				<span>7</span>
				<span>8</span>
				<span>9</span>
				<span>10</span>
			</div>
		</div>

		<!-- Comments Section -->
		<div class="form-section">
			<div class="label">
				<span class="label-text">Comments (Optional)</span>
			</div>
			<textarea
				class="textarea textarea-bordered w-full h-24"
				id="comments"
				name="comments"
				bind:value={comments}
				placeholder="Additional comments about the project..."
			></textarea>
		</div>

		<!-- Final Score Summary -->
		<div class="score-summary">
			<div class="alert alert-info">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="stroke-info shrink-0 w-6 h-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<div>
					<span class="font-medium">Total points: {totalScore}/{maxTotalScore}</span>
				</div>
			</div>
		</div>

		<!-- Submit Button -->
		<div class="form-section">
			<button class="btn btn-primary w-full" type="submit">
				{existingRating ? 'Update Rating' : 'Submit Rating'}
			</button>
			{#if error}<div class="text-error mt-2">{error}</div>{/if}
		</div>
	{/if}

	<!-- Include existing rating ID if we're updating -->
	{#if existingRating}
		<input type="hidden" name="ratingId" value={existingRating.id} />
	{/if}
</form>

<style>
	.rating-form {
		max-width: 600px;
		width: 100%;
		margin: 0 auto;
		padding: 1.5rem;
		background-color: #1e1f22;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		color: #f0f0f0;
	}

	.divider {
		margin: 1.5rem 0;
		height: 1px;
		background-color: rgba(255, 255, 255, 0.1);
		position: relative;
		text-align: center;
	}

	.divider::after {
		content: attr(data-content);
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: #1e1f22;
		padding: 0 1rem;
		color: #ccc;
		font-size: 0.9rem;
	}

	.form-section {
		margin-bottom: 1.5rem;
	}

	.label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.label-text {
		color: #f0f0f0;
		font-size: 0.95rem;
	}

	.label-text-alt {
		color: #a3a3a3;
		font-size: 0.85rem;
	}

	.range {
		width: 100%;
		height: 8px;
		-webkit-appearance: none;
		appearance: none;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		outline: none;
	}

	.range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.range::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.range::-webkit-slider-thumb:hover {
		transform: scale(1.15);
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
	}

	.range::-moz-range-thumb:hover {
		transform: scale(1.15);
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
	}

	.score-summary {
		margin: 2rem 0;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
		font-weight: 500;
		padding: 0.75rem;
		transition: all 0.2s ease;
	}

	.btn-primary:hover {
		background-color: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
		color: #a3a3a3;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(59, 130, 246, 0.2);
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.rating-form {
			padding: 1rem;
			border-radius: 6px;
		}

		.label-text {
			font-size: 0.9rem;
		}

		.label-text-alt {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.w-full.flex.justify-between {
			font-size: 0.7rem;
		}
	}
</style>
