<script lang="ts">
	import { onDestroy } from 'svelte';
	import FallbackSvg from './DropFileFallbackSvg.svelte';

	export let multiple: boolean = false;
	export let disabled: boolean = false;
	export let onDrop: (files: File[]) => void;
	export let onEnter: () => void = () => {};
	export let onLeave: () => void = () => {};

	let isOver = false;
	let input: HTMLInputElement;
	let selectedFiles: File[] = [];
	let pdfPreviews: { file: File; url: string }[] = [];

	// New state for fetch submission
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	const uploadUrl = '?/upload'; // adjust if needed

	const handleEnter = () => {
		isOver = true;
		onEnter?.();
	};

	const handleLeave = () => {
		isOver = false;
		onLeave?.();
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		if (!e?.dataTransfer?.files || disabled) return;

		const items = Array.from(e.dataTransfer.files);
		selectedFiles = items;
		generatePdfPreviews(items);
		onDrop(items);
		isOver = false;
	};

	const handleDragOver = (e: Event) => {
		e.preventDefault();
	};

	const handleChange = (e: Event) => {
		e.preventDefault();
		const files = (e.target as HTMLInputElement).files;
		if (!files) return;
		selectedFiles = Array.from(files);
		generatePdfPreviews(selectedFiles);
		onDrop(selectedFiles);
	};

	const generatePdfPreviews = (files: File[]) => {
		// Clean previous
		pdfPreviews.forEach((p) => URL.revokeObjectURL(p.url));
		pdfPreviews = files
			.filter((f) => f.type === 'application/pdf')
			.map((file) => ({ file, url: URL.createObjectURL(file) }));
	};

	const onClick = () => {
		if (!disabled) input.click();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') onClick();
	};

	async function handleSubmit() {
		if (loading || disabled) return;
		if (selectedFiles.length === 0) return;

		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			// Field naming (adjust to what your backend expects)
			if (multiple) {
				selectedFiles.forEach((file) => formData.append('files', file));
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
		} catch (err: any) {
			errorMessage = err?.message || 'Upload failed.';
		} finally {
			loading = false;
		}
	}

	onDestroy(() => {
		pdfPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
	});
</script>

<form
	class="flex flex-col gap-4 rounded-box bg-base-200 p-6 max-w-md content-center"
	enctype="multipart/form-data"
	on:submit|preventDefault={handleSubmit}
>
	<div
		id="zone"
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragenter={handleEnter}
		on:dragleave={handleLeave}
		on:click={onClick}
		on:keydown={onKeyDown}
		tabindex="0"
		class="outline-none"
	>
		<slot>
			<div id="fallback" class:active={isOver}>
				<FallbackSvg over={isOver} />
			</div>
		</slot>
	</div>

	<input
		id="hidden-input"
		type="file"
		name={multiple ? 'files' : 'file'}
		accept=".pdf"
		on:change={handleChange}
		bind:this={input}
		{multiple}
		{disabled}
	/>

	{#if selectedFiles.length > 0}
		<div class="selected-files">
			<p>Selected files:</p>
			<ul>
				{#each selectedFiles as file}
					<li>{file.name} ({Math.round(file.size / 1024)} KB)</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if pdfPreviews.length > 0}
		<div class="pdf-previews">
			{#each pdfPreviews as preview, i}
				<div class="pdf-preview">
					<h4>Preview of {preview.file.name}</h4>
					<iframe title={"PDF Preview " + i} src={preview.url} class="pdf-iframe" />
				</div>
			{/each}
		</div>
	{/if}

	<button
		type="submit"
		class="btn btn-primary justify-center"
		disabled={selectedFiles.length === 0 || loading || disabled}
		on:click|preventDefault={handleSubmit}
	>
		{#if loading}
			<span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
		{/if}
		Submit PDF
	</button>

	{#if errorMessage}
		<div class="alert alert-error mt-2 text-sm">
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert alert-success mt-2 text-sm">
			<span>{successMessage}</span>
		</div>
	{/if}
</form>

<style>
	#zone {
		width: 100%;
		height: 100%;
		cursor: pointer;
	}
	#hidden-input {
		display: none;
	}
	#fallback {
		display: grid;
		align-items: center;
		width: 100%;
		height: 200px;
		border: 2px dashed #9ca3af;
		border-radius: 10px;
		transition: all 0.2s ease-in-out;
	}
	#fallback.active {
		border-color: #3b82f6;
		background-color: rgba(59, 130, 246, 0.1);
	}
	#fallback :global(svg) {
		margin: auto;
		max-width: 100%;
		max-height: 100%;
	}
	.selected-files {
		margin-top: 1rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background-color: rgba(0, 0, 0, 0.05);
	}
	.selected-files p {
		font-weight: bold;
		margin-bottom: 0.5rem;
	}
	.selected-files ul {
		list-style: none;
		padding-left: 1rem;
	}
	.pdf-previews {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}
	.pdf-preview {
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		overflow: hidden;
	}
	.pdf-preview h4 {
		padding: 0.5rem;
		margin: 0;
		background-color: #f3f4f6;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.pdf-iframe {
		width: 100%;
		height: 400px;
		border: none;
	}
</style>
