	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let teamId: string;
	const eventConfig = $page.data.eventConfig;

	// Dynamic scores based on criteria
	let scores = $state(
		Object.fromEntries(eventConfig.rating_criteria.map((c) => [c.key, Math.floor(c.maxScore / 2)]))
	);

	let comments = $state('');
	let error = $state('');
	let existingRating = $state(null);
	let loading = $state(true);

	// Scale constants
	const minScore = 1;

	// Calculate total score
	const totalScore = $derived(
		Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
	);
	const maxTotalScore = $derived(
		eventConfig.rating_criteria.reduce((acc, curr) => acc + curr.maxScore, 0)
	);

	onMount(async () => {
		try {
			loading = true;
			const response = await fetch(`/api/ratings?teamId=${teamId}`);
			const data = await response.json();

			if (data.found) {
				existingRating = data.rating;
				// Load existing scores
				eventConfig.rating_criteria.forEach((criterion) => {
					if (existingRating[criterion.key] !== undefined) {
						scores[criterion.key] = existingRating[criterion.key];
					}
				});
				comments = existingRating.comments ?? '';
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
			if (result.type === 'success' || result.type === 'redirect') {
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
		<p class="text-gray-400 mb-6">Please grade this project based on the criteria below</p>

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

		{#each eventConfig.rating_criteria as criterion}
			<div class="form-section">
				<div class="label">
					<span class="label-text font-bold">{criterion.name}</span>
					<span class="label-text-alt">{scores[criterion.key]}/{criterion.maxScore} points</span>
				</div>

				{#if criterion.description}
					<p class="text-xs text-gray-500 mb-2">{criterion.description}</p>
				{/if}

				<input
					type="range"
					min={minScore}
					max={criterion.maxScore}
					step="1"
					class="range range-primary"
					bind:value={scores[criterion.key]}
					name={criterion.key}
				/>

				<div class="w-full flex justify-between text-xs px-1 mt-1">
					{#each Array(criterion.maxScore) as _, i}
						<span>{i + 1}</span>
					{/each}
				</div>
			</div>
		{/each}

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

	@media (max-width: 768px) {
		.rating-form {
			padding: 1rem;
			border-radius: 6px;
		}

		.label {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.label-text {
			font-size: 0.9rem;
		}

		.label-text-alt {
			font-size: 0.8rem;
		}

		.range {
			width: 100%;
		}

		.w-full.flex.justify-between {
			font-size: 0.7rem;
		}

		.score-summary {
			margin: 1rem 0;
		}

		.form-section {
			margin-bottom: 1rem;
		}
	}

	@media (max-width: 480px) {
		.w-full.flex.justify-between {
			font-size: 0.6rem;
		}

		h2.text-2xl.font-bold.mb-3 {
			font-size: 1.5rem;
		}
	}
</style>
