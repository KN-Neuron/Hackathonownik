<script>
	import '../../app.css';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	const { teamId } = $props();

	let innovation = 3;
	let usefulness = 3;
	let finalPresentation = 3;
	let implementation = 5; // Default to middle of 1-10 scale

	let comments = '';
	let error = '';

	// Scale constants
	const minScore = 1;
	const maxStandardScore = 5; // For innovation, usefulness, presentation
	const maxImplementationScore = 10;

	// Calculate total score
	let totalScore = innovation + usefulness + finalPresentation + implementation;
	let maxTotalScore = maxStandardScore * 3 + maxImplementationScore; // 25
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
	class="flex flex-col gap-4 rounded-box bg-base-200 p-8 max-w-md mx-auto my-8"
>
	<fieldset>
		<h1 class="text-3xl font-bold text-center mb-2">Project Grading</h1>

		<span class="text-center text-gray-400 text-sm">
			Please grade this project based on the four criteria below
		</span>

		<div class="divider mt-8 mb-8">Heroes of the Brain</div>

		<label class="form-control flex flex-col mb-4">
			<div class="label">
				<span class="label-text">Project ID</span>
			</div>

			<input
				class="input input-bordered w-full"
				id="teamId"
				name="teamId"
				type="text"
				value={teamId}
				placeholder="Team ID"
				readonly
				required
			/>

			<input type="hidden" name="teamId" value={teamId} />
		</label>

		<div class="form-control mb-4">
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
				style="width: 100%;"
			/>
			<div class="w-full flex justify-between text-xs px-0">
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
				<span>5</span>
			</div>
		</div>

		<div class="form-control mb-4">
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
				style="width: 100%;"
			/>
			<div class="w-full flex justify-between text-xs px-0">
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
				<span>5</span>
			</div>
		</div>

		<div class="form-control mb-4">
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
				style="width: 100%;"
			/>
			<div class="w-full flex justify-between text-xs px-0">
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
				<span>5</span>
			</div>
		</div>

		<div class="form-control mb-4">
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
				style="width: 100%;"
			/>
			<div class="w-full flex justify-between text-xs px-0">
				<span>1</span>
				<span>3</span>
				<span>5</span>
				<span>7</span>
				<span>10</span>
			</div>
		</div>

		<label class="form-control flex flex-col mb-4">
			<div class="label">
				<span class="label-text">Comments (Optional)</span>
			</div>
			<textarea
				class="textarea textarea-bordered h-24"
				id="comments"
				name="comments"
				bind:value={comments}
				placeholder="Additional comments about the project..."
			></textarea>
		</label>

		<div class="alert alert-info mb-4">
			<span>Total points: {totalScore}/{maxTotalScore}</span>
		</div>

		<button class="btn btn-primary" type="submit">Submit Grades</button>
		{#if error}<div class="text-error mt-2">{error}</div>{/if}
	</fieldset>
</form>
