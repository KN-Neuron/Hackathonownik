<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import FallbackSvg from '../DropFileFallbackSvg.svelte';

	export let multiple: boolean = false;
	export let disabled: boolean = false;
	export let uploadUrl: string = '?/upload';

	const dispatch = createEventDispatcher<{
		files: { files: File[] };
		uploaded: { success: boolean; message?: string };
	}>();

	let isOver = false;
	let input: HTMLInputElement | null = null;
	let selectedFiles: File[] = [];

	let uploading = false;
	let errorMessage = '';
	let successMessage = '';

	function handleEnter() {
		isOver = true;
	}
	function handleLeave() {
		isOver = false;
	}
	function handleDragOver(e: Event) {
		e.preventDefault();
	}

	function filterPdf(list: FileList | File[]): File[] {
		return Array.from(list).filter((f) => f.type === 'application/pdf');
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!e?.dataTransfer?.files || disabled) return;
		selectedFiles = filterPdf(e.dataTransfer.files);
		dispatch('files', { files: selectedFiles });
		isOver = false;
	}

	function handleChange(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		if (!files) return;
		selectedFiles = filterPdf(files);
		dispatch('files', { files: selectedFiles });
	}

	function triggerPick() {
		if (!disabled) input?.click();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') triggerPick();
	}

	async function handleSubmit() {
		if (uploading || disabled || selectedFiles.length === 0) return;

		uploading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			if (multiple) {
				selectedFiles.forEach((f) => formData.append('files', f));
			} else {
				formData.append('file', selectedFiles[0]);
			}

			const res = await fetch(uploadUrl, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `Upload failed (${res.status})`);
			}

			successMessage = 'Upload successful.';
			dispatch('uploaded', { success: true, message: successMessage });
		} catch (err: any) {
			errorMessage = err?.message || 'Upload failed.';
			dispatch('uploaded', { success: false, message: errorMessage });
		} finally {
			uploading = false;
		}
	}
</script>

<form class="pdf-uploader" on:submit|preventDefault={handleSubmit} enctype="multipart/form-data">
	<div
		class="drop-zone"
		class:active={isOver}
		class:disabled
		tabindex="0"
		on:click={triggerPick}
		on:keydown={onKeyDown}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragenter={handleEnter}
		on:dragleave={handleLeave}
	>
		<FallbackSvg over={isOver} />
	</div>

	<input
		bind:this={input}
		type="file"
		name={multiple ? 'files' : 'file'}
		{multiple}
		{disabled}
		accept=".pdf"
		class="hidden-input"
		on:change={handleChange}
	/>

	{#if selectedFiles.length > 0}
		<div class="selected-files">
			<p class="files-heading">Selected file{selectedFiles.length > 1 ? 's' : ''}:</p>
			<ul class="files-list">
				{#each selectedFiles as file}
					<li class="file-item">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
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
						<span class="file-name">{file.name}</span>
						<span class="file-size">({Math.round(file.size / 1024)} KB)</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		type="submit"
		class="submit-button"
		disabled={selectedFiles.length === 0 || uploading || disabled}
	>
		{#if uploading}
			<span class="loading-spinner"></span>
			Uploading...
		{:else}
			Submit PDF
		{/if}
	</button>

	{#if errorMessage}
		<div class="alert error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert success">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
				<polyline points="22 4 12 14.01 9 11.01"></polyline>
			</svg>
			<span>{successMessage}</span>
		</div>
	{/if}

	<p class="helper-text">Drag & drop a PDF or click to select file</p>
</form>

<style>
	.pdf-uploader {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.drop-zone {
		width: 100%;
		height: 180px;
		background-color: rgba(0, 0, 0, 0.2);
		border: 2px dashed rgba(127, 123, 255, 0.4);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.25s ease-in-out;
	}

	.drop-zone:hover {
		background-color: rgba(127, 123, 255, 0.05);
	}

	.drop-zone.active {
		border-color: #4df2ff;
		background-color: rgba(127, 123, 255, 0.1);
		transform: scale(1.01);
	}

	.drop-zone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hidden-input {
		display: none;
	}

	.selected-files {
		width: 100%;
		padding: 0.75rem;
		background-color: rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.files-heading {
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: #f0f0f0;
	}

	.files-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #e0e0e0;
		overflow-wrap: break-word;
		word-break: break-all;
		padding: 0.35rem;
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.05);
	}

	.file-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
	}

	.submit-button {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 8px;
		background: linear-gradient(135deg, #7f7bff, #4df2ff);
		color: #0f1322;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(127, 123, 255, 0.25);
	}

	.submit-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(127, 123, 255, 0.35);
	}

	.submit-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(15, 19, 34, 0.3);
		border-top-color: #0f1322;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.alert {
		width: 100%;
		padding: 0.75rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.alert.error {
		background-color: rgba(220, 38, 38, 0.15);
		border: 1px solid rgba(220, 38, 38, 0.3);
		color: #ff8080;
	}

	.alert.success {
		background-color: rgba(54, 195, 153, 0.15);
		border: 1px solid rgba(54, 195, 153, 0.3);
		color: #a3f0b5;
	}

	.helper-text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-align: center;
		margin-top: 0.5rem;
	}

	@media (max-width: 640px) {
		.drop-zone {
			height: 150px;
		}

		.file-item {
			font-size: 0.75rem;
			padding: 0.25rem;
		}

		.submit-button {
			padding: 0.65rem;
		}
	}

	@media (max-width: 400px) {
		.drop-zone {
			height: 130px;
		}
	}
</style>
