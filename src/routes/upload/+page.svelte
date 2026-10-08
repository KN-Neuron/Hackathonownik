<script lang="ts">
	import { enhance } from '$app/forms';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import PdfUpload from '$lib/components/pdf/PdfUpload.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PdfViewer from '$lib/components/pdf/PdfViewer.svelte';
	import SubmissionChecklist from '$lib/components/SubmissionChecklist.svelte';
	import { SUBMISSION_ITEM_LABELS, type SubmissionItem } from '$lib/types';

	let { data } = $props();

	let icon = IconNames.Upload;
	let text = 'Submit Your Project';

	let selectedFiles = $state<File[]>([]);
	let repoLink = $state(data.submission?.repo?.url ?? '');
	let videoLink = $state(data.submission?.video?.url ?? '');
	let showPresentationModal = $state(false);
	let fullscreenMode = $state(false);
	let saving = $state(false);
	let resultMessage = $state('');
	let resultSuccess = $state(false);
	// Remounts the PDF picker after a successful save to clear the selected file
	let pickerKey = $state(0);

	const deadline = new Date(data.eventConfig.deadline);
	const showDeadlineMessage = new Date() > deadline;

	function handleFiles(e: CustomEvent) {
		selectedFiles = e.detail.files;
	}

	function toggleFullscreen() {
		fullscreenMode = !fullscreenMode;
	}
</script>

<div class="upload-page">
	<HeaderText {icon} {text} />

	{#if data.hasTeam}
		<div class="checklist-wrapper">
			<SubmissionChecklist
				submission={data.submission}
				required={data.eventConfig.submission.required}
			/>
		</div>
	{/if}

	{#if showDeadlineMessage}
		<div class="deadline-notice">
			<h3>Submission Deadline Passed</h3>
			<p>The deadline for submitting presentations was on {deadline.toLocaleString()}.</p>
			<p>No new presentations can be submitted at this time.</p>
		</div>
	{:else}
		<div class="intro-section">
			<p>
				You can add each item separately – fill in <b>only what you want to add or change</b>,
				everything else stays as it is. The jury always sees the latest version of the PDF, the
				repository link and the video link, no matter who in your team added them.
			</p>
			<p class="deadline-info">Deadline: {deadline.toLocaleString()}</p>
		</div>

		<div class="upload-container">
			<div class="upload-card">
				<form
					method="post"
					action="?/upload"
					class="upload-form"
					enctype="multipart/form-data"
					use:enhance={({ formData }) => {
						saving = true;
						resultMessage = '';
						if (selectedFiles.length > 0) {
							formData.set('file', selectedFiles[0]);
						}

						return async ({ result, update }) => {
							saving = false;
							const payload = result.type === 'success' ? result.data : null;
							resultSuccess = Boolean(payload?.success);
							resultMessage = (payload?.message as string) || 'Saving failed. Please try again.';
							if (resultSuccess) {
								selectedFiles = [];
								pickerKey += 1;
							}
							// Keep typed links; refresh the checklist from the server
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="csrf_token" value={data.csrfToken} />

					<h2 class="section-title" id="presentation_file">
						<span class="section-indicator"></span>
						Presentation (PDF)
					</h2>
					<p class="repo-help">
						{data.submission?.presentation
							? `Current file: ${data.submission.presentation.fileName}. Select a new one only if you want to replace it.`
							: 'No presentation uploaded yet.'}
						Suggested file name: your team name in camelCase, e.g. "Neuron Team" → neuronTeam.pdf.
					</p>

					<div class="upload-area">
						{#key pickerKey}
							<PdfUpload multiple={false} on:files={handleFiles} />
						{/key}

						{#if selectedFiles.length > 0}
							<button
								type="button"
								class="preview-button"
								onclick={() => (showPresentationModal = true)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
								Preview Selected PDF
							</button>
						{/if}
					</div>

					<div class="repo-link-section">
						<label for="repo_link" class="repo-label">Repository Link</label>
						<input
							type="url"
							id="repo_link"
							name="repo_link"
							placeholder="https://github.com/username/repository"
							bind:value={repoLink}
							class="repo-input"
						/>
						<p class="repo-help">
							Link to your project's source code repository (e.g., GitHub, GitLab)
						</p>
					</div>

					<div class="repo-link-section">
						<label for="video_link" class="repo-label">Video Link</label>
						<input
							type="url"
							id="video_link"
							name="video_link"
							placeholder="https://youtube.com/watch?v=..."
							bind:value={videoLink}
							class="repo-input"
						/>
						<p class="repo-help">Link to your project's demo video (e.g., YouTube, Loom)</p>
					</div>

					<div class="submit-row">
						<button type="submit" class="btn btn-primary" disabled={saving}>
							{#if saving}
								<span class="loading loading-spinner loading-sm"></span>
								Saving...
							{:else}
								Save submission
							{/if}
						</button>
						{#if resultMessage}
							<div
								class="alert"
								class:alert-success={resultSuccess}
								class:alert-error={!resultSuccess}
							>
								{resultMessage}
							</div>
						{/if}
					</div>
				</form>

				<div class="guidelines">
					<h3>Upload Guidelines:</h3>
					<ul>
						<li>Only PDF files are accepted, maximum file size: 40MB</li>
						<li>
							Required for a complete submission:
							{data.eventConfig.submission.required
								.map((item: SubmissionItem) => SUBMISSION_ITEM_LABELS[item])
								.join(', ')}
						</li>
						<li>
							You can update any item until the deadline – the newest version replaces the old one
						</li>
						<li>Every change is listed with its author on the "My Submission" page</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}
</div>

<Modal bind:show={showPresentationModal} fullHeight={true} fullScreen={fullscreenMode}>
	{#snippet header()}
		<div class="flex justify-between items-center w-full">
			<h2>PDF Preview</h2>
			<button class="btn btn-sm" onclick={toggleFullscreen}>
				{fullscreenMode ? 'Exit Fullscreen' : 'Enter Fullscreen'}
			</button>
		</div>
	{/snippet}

	<PdfViewer files={selectedFiles} />
</Modal>

<style>
	.upload-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.intro-section {
		margin-bottom: 1.5rem;
		max-width: 800px;
		color: #f0f0f0;
		opacity: 0.8;
		line-height: 1.5;
	}

	.intro-section .deadline-info {
		color: #ff6b6b;
		font-weight: 500;
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	.deadline-notice {
		background-color: rgba(255, 107, 107, 0.1);
		border: 1px solid rgba(255, 107, 107, 0.3);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 1rem 0;
		text-align: center;
	}

	.deadline-notice h3 {
		color: #ff6b6b;
		margin: 0 0 0.5rem 0;
	}

	.deadline-notice p {
		margin: 0.25rem 0;
		color: #f0f0f0;
	}

	.upload-container {
		margin: 1.5rem 0 3rem;
	}

	.upload-card {
		background-color: rgba(30, 31, 34, 0.8);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
		padding: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 640px) {
		.upload-card {
			padding: 1.25rem;
			border-radius: 8px;
		}
	}

	.section-title {
		font-size: 1.25rem;
		color: #7f7bff;
		margin-bottom: 1.75rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.checklist-wrapper {
		margin-bottom: 1.5rem;
	}

	.submit-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.section-indicator {
		display: block;
		width: 4px;
		height: 1.25rem;
		background: linear-gradient(to bottom, #7f7bff, #4df2ff);
		border-radius: 2px;
	}

	.upload-area {
		max-width: 600px;
		margin: 0 auto 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.preview-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
		font-weight: 600;
		padding: 0.6rem 1.25rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: 0 2px 10px rgba(127, 123, 255, 0.3);
		width: fit-content;
		margin-top: 0.75rem;
	}

	.preview-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(127, 123, 255, 0.4);
	}

	.preview-button:active {
		transform: translateY(0);
	}

	.repo-link-section {
		margin: 1.5rem 0;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.repo-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: #f0f0f0;
		margin-bottom: 0.5rem;
	}

	.repo-input {
		width: 100%;
		padding: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background-color: rgba(0, 0, 0, 0.3);
		color: #f0f0f0;
		font-size: 1rem;
	}

	.repo-input:focus {
		outline: none;
		border-color: #7f7bff;
		box-shadow: 0 0 0 2px rgba(127, 123, 255, 0.3);
	}

	.repo-help {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 0.5rem;
		margin-bottom: 0;
	}

	.guidelines {
		margin-top: 2rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.75rem;
		padding: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.guidelines h3 {
		font-size: 0.9rem;
		margin-bottom: 1rem;
		color: #f0f0f0;
		font-weight: 600;
	}

	.guidelines ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.guidelines li {
		position: relative;
		padding-left: 1.25rem;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.guidelines li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: #4df2ff;
		font-weight: bold;
	}

	@media (max-width: 480px) {
		.guidelines {
			padding: 1rem;
		}

		.guidelines li {
			font-size: 0.8rem;
		}
	}
</style>
