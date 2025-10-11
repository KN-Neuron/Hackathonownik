<script>
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import PdfUpload from '$lib/components/pdf/PdfUpload.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PdfViewer from '$lib/components/pdf/PdfViewer.svelte';

	let icon = IconNames.Upload;
	let text = 'Upload Presentation';

	let selectedFiles = [];
	let showPresentationModal = false;
	let fullscreenMode = false;

	function handleFiles(e) {
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

	<div class="intro-section">
		<p>
			Upload your team's presentation in PDF format. Maximum file size is 10MB. After uploading,
			your presentation will be available for jury members to review and rate.
		</p>
	</div>

	<div class="upload-container">
		<div class="upload-card">
			<h2 class="section-title">
				<span class="section-indicator"></span>
				PDF Upload & Preview
			</h2>

			<div class="upload-area">
				<PdfUpload multiple={false} uploadUrl="?/upload" on:files={handleFiles} />

				{#if selectedFiles.length > 0}
					<button class="preview-button" on:click={() => (showPresentationModal = true)}>
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

			<div class="guidelines">
				<h3>Upload Guidelines:</h3>
				<ul>
					<li>Only PDF files are accepted</li>
					<li>Maximum file size: 10MB</li>
					<li>Ensure your presentation is complete and final before uploading</li>
					<li>Your latest upload will replace any previous uploads</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<Modal bind:show={showPresentationModal} fullHeight={true} fullScreen={fullscreenMode}>
	{#snippet header()}
		<div class="flex justify-between items-center w-full">
			<h2>PDF Preview</h2>
			<button class="btn btn-sm" on:click={toggleFullscreen}>
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
