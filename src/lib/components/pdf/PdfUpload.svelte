<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { enhance } from '$app/forms';

	interface Props {
		multiple?: boolean;
		uploadUrl?: string;
		csrfToken?: string;
		repoLink?: string;
	}

	let { multiple = false, uploadUrl = '', csrfToken = '', repoLink = '' }: Props = $props();

	const dispatch = createEventDispatcher();

	let fileInput: HTMLInputElement;
	let isDragging = $state(false);
	let files = $state<File[]>([]);
	let uploadStatus = $state<'idle' | 'uploading' | 'success' | 'error'>('idle');
	let uploadMessage = $state('');
	let uploadProgress = $state(0);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			handleFiles(Array.from(target.files));
		}
	}

	function handleDrop(event: DragEvent) {
		isDragging = false;
		event.preventDefault();

		if (event.dataTransfer?.files) {
			handleFiles(Array.from(event.dataTransfer.files));
		}
	}

	async function handleFiles(newFiles: File[]) {
		// Validate files
		const validFiles = [];
		
		for (const file of newFiles) {
			// Only PDFs - check both extension and header
			if (!file.name.toLowerCase().endsWith('.pdf')) {
				uploadMessage = 'Only PDF files are allowed';
				uploadStatus = 'error';
				return; // Exit early on first invalid file to prevent multiple error messages
			}

			// Max 10MB
			const maxSize = 10 * 1024 * 1024;
			if (file.size > maxSize) {
				uploadMessage = 'File size exceeds 10MB limit';
				uploadStatus = 'error';
				return;
			}

			// Validate filename (no special characters, path traversal)
			const filename = file.name;
			if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes('..')) {
				uploadMessage =
					'Invalid filename. Use only letters, numbers, dots, dashes, and underscores';
				uploadStatus = 'error';
				return;
			}

			// Validate PDF header (first few bytes should be %PDF)
			try {
				const buffer = await file.arrayBuffer();
				const bytes = new Uint8Array(buffer);
				
				// Check first 4 bytes for PDF signature "%PDF"
				const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
				const isValidPdf = pdfSignature.every((byte, index) => bytes[index] === byte);
				
				if (!isValidPdf) {
					uploadMessage = 'File is not a valid PDF';
					uploadStatus = 'error';
					return;
				}
			} catch (e) {
				uploadMessage = 'Could not validate file content';
				uploadStatus = 'error';
				return;
			}

			validFiles.push(file);
		}

		if (validFiles.length > 0) {
			if (multiple) {
				files = [...files, ...validFiles];
			} else {
				files = [validFiles[0]];
			}
			dispatch('files', { files });
			uploadStatus = 'idle';
			uploadMessage = '';
		}
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		dispatch('files', { files });
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
</script>

<div class="pdf-upload">
	<div
		class="dropzone"
		class:dragging={isDragging}
		role="button"
		tabindex="0"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput.click()}
		onkeypress={(e) => e.key === 'Enter' && fileInput.click()}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
			<polyline points="17 8 12 3 7 8"></polyline>
			<line x1="12" y1="3" x2="12" y2="15"></line>
		</svg>

		<p class="dropzone-text">
			{#if isDragging}
				Drop your PDF here
			{:else}
				Drag & drop your PDF here, or click to select
			{/if}
		</p>
		<p class="dropzone-subtext">Max file size: 10MB • Only PDF files</p>
	</div>

	<input
		type="file"
		bind:this={fileInput}
		{multiple}
		accept=".pdf,application/pdf,application/x-pdf"
		onchange={handleFileSelect}
		style="display: none"
	/>

	{#if files.length > 0}
		<div class="files-list">
			<h3>Selected Files:</h3>
			{#each files as file, index}
				<div class="file-item">
					<div class="file-info">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
							<polyline points="14 2 14 8 20 8"></polyline>
							<line x1="16" y1="13" x2="8" y2="13"></line>
							<line x1="16" y1="17" x2="8" y2="17"></line>
							<polyline points="10 9 9 9 8 9"></polyline>
						</svg>
						<div class="file-details">
							<span class="file-name">{file.name}</span>
							<span class="file-size">{formatFileSize(file.size)}</span>
						</div>
					</div>
					<button type="button" class="remove-btn" onclick={() => removeFile(index)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
			{/each}
		</div>

		{#if uploadUrl}
			<form
				method="POST"
				action={uploadUrl}
				enctype="multipart/form-data"
				use:enhance={({ formData }) => {
					uploadStatus = 'uploading';
					uploadProgress = 0;

					// Dodaj plik do formData
					if (files.length > 0) {
						formData.set('file', files[0]);
					}

					// Add repo_link if provided
					if (repoLink) {
						formData.set('repo_link', repoLink);
					}

					// CSRF token już jest w hidden input

					// Simulate progress
					const interval = setInterval(() => {
						uploadProgress += 10;
						if (uploadProgress >= 90) {
							clearInterval(interval);
						}
					}, 200);

					return async ({ result, update }) => {
						clearInterval(interval);
						uploadProgress = 100;

						if (result.type === 'success') {
							uploadStatus = 'success';
							uploadMessage = result.data?.message || 'Upload successful!';
							setTimeout(() => {
								files = [];
								uploadStatus = 'idle';
								uploadMessage = '';
								uploadProgress = 0;
							}, 3000);
						} else {
							uploadStatus = 'error';
							uploadMessage = result.data?.message || 'Upload failed. Please try again.';
						}

						await update();
					};
				}}
			>
				<!-- CSRF Token -->
				{#if csrfToken}
					<input type="hidden" name="csrf_token" value={csrfToken} />
				{/if}

				<button type="submit" class="upload-btn" disabled={uploadStatus === 'uploading'}>
					{#if uploadStatus === 'uploading'}
						<svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Uploading...
					{:else}
						Upload PDF
					{/if}
				</button>
			</form>

			{#if uploadStatus === 'uploading'}
				<div class="progress-bar">
					<div class="progress-fill" style="width: {uploadProgress}%"></div>
				</div>
			{/if}

			{#if uploadMessage}
				<div
					class="upload-message"
					class:success={uploadStatus === 'success'}
					class:error={uploadStatus === 'error'}
				>
					{uploadMessage}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.pdf-upload {
		width: 100%;
	}

	.dropzone {
		border: 2px dashed rgba(127, 123, 255, 0.5);
		border-radius: 0.75rem;
		padding: 2.5rem 1.5rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: rgba(0, 0, 0, 0.2);
		outline: none;
	}

	.dropzone:hover,
	.dropzone:focus {
		border-color: #7f7bff;
		background: rgba(127, 123, 255, 0.05);
	}

	.dropzone.dragging {
		border-color: #4df2ff;
		background: rgba(77, 242, 255, 0.1);
		transform: scale(1.02);
	}

	.dropzone svg {
		margin: 0 auto 1rem;
		color: #7f7bff;
	}

	.dropzone-text {
		font-size: 1rem;
		font-weight: 500;
		color: #f0f0f0;
		margin-bottom: 0.5rem;
	}

	.dropzone-subtext {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.files-list {
		margin-top: 1.5rem;
	}

	.files-list h3 {
		font-size: 0.9rem;
		color: #f0f0f0;
		margin-bottom: 0.75rem;
		font-weight: 600;
	}

	.file-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 0.5rem;
		margin-bottom: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.file-info svg {
		color: #4df2ff;
		flex-shrink: 0;
	}

	.file-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.file-name {
		font-size: 0.9rem;
		color: #f0f0f0;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.remove-btn {
		padding: 0.4rem;
		background: rgba(255, 77, 77, 0.1);
		border: 1px solid rgba(255, 77, 77, 0.3);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		color: #ff4d4d;
		flex-shrink: 0;
	}

	.remove-btn:hover {
		background: rgba(255, 77, 77, 0.2);
		border-color: #ff4d4d;
	}

	.upload-btn {
		width: 100%;
		margin-top: 1rem;
		padding: 0.75rem;
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
		font-weight: 600;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 2px 10px rgba(127, 123, 255, 0.3);
	}

	.upload-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(127, 123, 255, 0.4);
	}

	.upload-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		margin-top: 0.75rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		transition: width 0.3s ease;
	}

	.upload-message {
		margin-top: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.upload-message.success {
		background: rgba(77, 242, 77, 0.1);
		border: 1px solid rgba(77, 242, 77, 0.3);
		color: #4df24d;
	}

	.upload-message.error {
		background: rgba(255, 77, 77, 0.1);
		border: 1px solid rgba(255, 77, 77, 0.3);
		color: #ff4d4d;
	}

	@media (max-width: 640px) {
		.dropzone {
			padding: 2rem 1rem;
		}

		.file-name {
			font-size: 0.85rem;
		}
	}
</style>
