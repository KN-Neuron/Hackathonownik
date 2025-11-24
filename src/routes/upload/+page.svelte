<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import PdfUpload from '$lib/components/pdf/PdfUpload.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PdfViewer from '$lib/components/pdf/PdfViewer.svelte';

	let { data } = $props();

	let icon = IconNames.Upload;
	let text = 'Upload Presentation';

	let selectedFiles = $state([]);
	let repoLink = $state('');
	let videoLink = $state('');
	let showPresentationModal = $state(false);
	let fullscreenMode = $state(false);
	let showDeadlineMessage = $state(false);

	// Check if submission is after deadline (12:00 PM on 30.11.2025)
	const deadline = new Date('2025-11-30T12:00:00');
	const now = new Date();
	if (now > deadline) {
		showDeadlineMessage = true;
	}

	function handleFiles(e: CustomEvent) {
		selectedFiles = e.detail.files;
		if (selectedFiles.length > 0) {
			showPresentationModal = true;
		}
	}

	function toggleFullscreen() {
		fullscreenMode = !fullscreenMode;
	}
</script>

<div class="upload-page">
	<HeaderText {icon} {text} />

	{#if showDeadlineMessage}
		<div class="deadline-notice">
			<h3>Submission Deadline Passed</h3>
			<p>The deadline for submitting presentations was on November 30, 2025 at 12:00 PM.</p>
			<p>No new presentations can be submitted at this time.</p>
		</div>
	{:else}
		<div class="intro-section">
			<p>
				<b class="camelCase"
					>File name should be your team name in camelCase. For example "Neuron Team" =>
					neuronTeam.pdf</b
				>
				<br />
				Upload your team's presentation in PDF format. Maximum file size is 40MB. After uploading, your
				presentation will be available for jury members to review and rate.
			</p>
			<p class="deadline-info">Deadline: November 30, 2025 at 12:00 PM</p>
		</div>

		<div class="upload-container">
			<div class="upload-card">
				<h2 class="section-title">
					<span class="section-indicator"></span>
					PDF Upload & Preview
				</h2>

				<form method="post" action="?/upload" class="upload-form" enctype="multipart/form-data">
					<input type="hidden" name="csrf_token" value={data.csrfToken} />

					<div class="upload-area">
						<PdfUpload
							multiple={false}
							uploadUrl="?/upload"
							csrfToken={data.csrfToken}
							{repoLink}
							{videoLink}
							on:files={handleFiles}
						/>

						{#if selectedFiles.length > 0}
							<button class="preview-button" onclick={() => (showPresentationModal = true)}>
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
						<label for="repo_link" class="repo-label">Repository Link (Optional)</label>
						<input
							type="url"
							id="repo_link"
							name="repo_link"
							placeholder="https://github.com/username/repository"
							bind:value={repoLink}
							class="repo-input"
						/>
						<p class="repo-help">
							Provide a link to your project's source code repository (e.g., GitHub, GitLab)
						</p>
					</div>

					<div class="repo-link-section">
						<label for="video_link" class="repo-label">Video Link (Optional)</label>
						<input
							type="url"
							id="video_link"
							name="video_link"
							placeholder="https://youtube.com/watch?v=..."
							bind:value={videoLink}
							class="repo-input"
						/>
						<p class="repo-help">
							Provide a link to your project's demo video (e.g., YouTube, Vimeo)
						</p>
					</div>
				</form>

				<div class="guidelines">
					<h3>Upload Guidelines:</h3>
					<ul>
						<li>Only PDF files are accepted</li>
						<li>Maximum file size: 40MB</li>
						<li>Ensure your presentation is complete and final before uploading</li>
						<li>Your latest upload will replace any previous uploads</li>
						<li>Maximum 5 presentations per team</li>
						<li>Repository link is optional but recommended for jury review</li>
						<li>Video link is optional but recommended to showcase your project demo</li>
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

	.camelCase {
		font-size: 2em;
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
