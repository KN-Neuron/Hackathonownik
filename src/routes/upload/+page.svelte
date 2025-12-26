<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import PdfUpload from '$lib/components/pdf/PdfUpload.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PdfViewer from '$lib/components/pdf/PdfViewer.svelte';

	let { data } = $props();

	let icon = IconNames.Upload;
	let text = 'Submit Project';

	let selectedFiles = $state([]);
	let repoLink = $state('');
	let videoLink = $state('');
	let showPresentationModal = $state(false);
	let fullscreenMode = $state(false);
	let showDeadlineMessage = $state(false);

	const deadline = new Date('2025-12-30T12:00:00');
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
			<p>The deadline for submitting projects was on November 30, 2025 at 12:00 PM.</p>
			<p>No new projects can be submitted at this time.</p>
		</div>
	{:else}
		<div class="intro-section">
			<p>
				<b class="camelCase"
					>File name should be your team name in camelCase. For example "Neuron Team" =>
					neuronTeam.pdf</b
				>
				<br />
				Submit your complete project including presentation, code repository, and demo video. All components are required for jury evaluation.
			</p>
			<p class="deadline-info">Deadline: November 30, 2025 at 12:00 PM</p>
		</div>

		<div class="upload-container">
			<div class="upload-card">
				<h2 class="section-title">
					<span class="section-indicator"></span>
					Complete Project Submission
				</h2>

				<form method="post" action="?/upload" class="upload-form" enctype="multipart/form-data">
					<input type="hidden" name="csrf_token" value={data.csrfToken} />

					<div class="submission-grid">
						<!-- PDF Presentation Upload -->
						<div class="submission-section">
							<div class="section-header">
								<h3 class="section-label">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									Presentation PDF
								</h3>
								<p class="section-description">Upload your project presentation in PDF format</p>
							</div>

							<PdfUpload
								multiple={false}
								uploadUrl="?/upload"
								csrfToken={data.csrfToken}
								{repoLink}
								{videoLink}
								on:files={handleFiles}
							/>

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

						<!-- Repository Link -->
						<div class="submission-section">
							<div class="section-header">
								<h3 class="section-label">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
									</svg>
									Source Code Repository
								</h3>
								<p class="section-description">Provide a link to your project's source code</p>
							</div>

							<div class="input-group">
								<input
									type="url"
									name="repo_link"
									placeholder="https://github.com/username/repository"
									bind:value={repoLink}
									class="input input-bordered w-full"
									required
								/>
								<p class="input-help">
									Link to your project's source code repository (GitHub, GitLab, etc.)
								</p>
							</div>
						</div>

						<!-- Video Demo -->
						<div class="submission-section">
							<div class="section-header">
								<h3 class="section-label">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
									Demo Video
								</h3>
								<p class="section-description">Share a demo of your project in action</p>
							</div>

							<div class="input-group">
								<input
									type="url"
									name="video_link"
									placeholder="https://youtube.com/watch?v=..."
									bind:value={videoLink}
									class="input input-bordered w-full"
									required
								/>
								<p class="input-help">
									Link to your project demo video (YouTube, Loom, etc.)
								</p>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="submit-section">
						<button
							type="submit"
							class="btn btn-primary w-full btn-lg"
							disabled={selectedFiles.length === 0 || !repoLink || !videoLink}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
							Submit Complete Project
						</button>
						<p class="submit-help">All fields are required for submission</p>
					</div>
				</form>

				<div class="guidelines">
					<h3>Submission Guidelines:</h3>
					<ul>
						<li>PDF presentation must be in PDF format, maximum 40MB</li>
						<li>Ensure your presentation is complete and final before uploading</li>
						<li>
							Jury will see only the latest uploaded presentation. Maximum 5 presentations per team
							are allowed.
						</li>
						<li>Provide a working link to your source code repository</li>
						<li>Include a demo video showing your project in action</li>
						<li>All three components (PDF, repo link, video link) are required for a complete submission</li>
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

	.submission-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.submission-section {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.75rem;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-label {
		font-size: 1rem;
		font-weight: 600;
		color: #f0f0f0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.25rem 0;
	}

	.section-description {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input {
		background-color: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #f0f0f0;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 1rem;
	}

	.input:focus {
		outline: none;
		border-color: #7f7bff;
		box-shadow: 0 0 0 2px rgba(127, 123, 255, 0.3);
	}

	.input-help {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
	}

	.submit-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		font-weight: 600;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 10px rgba(127, 123, 255, 0.3);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(127, 123, 255, 0.4);
	}

	.btn-lg {
		padding: 1rem;
		font-size: 1.1rem;
	}

	.submit-help {
		text-align: center;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 0.5rem;
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

	@media (min-width: 768px) {
		.submission-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 767px) {
		.submission-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.guidelines {
			padding: 1rem;
		}

		.guidelines li {
			font-size: 0.8rem;
		}

		.btn-lg {
			padding: 0.8rem;
			font-size: 1rem;
		}
	}
</style>
