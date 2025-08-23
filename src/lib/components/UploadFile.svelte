<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';
	import FallbackSvg from './DropFileFallbackSvg.svelte';

	export let multiple: boolean = false;
	export let disabled: boolean = false;
	export let onDrop: (files: File[]) => void;
	export let onEnter: () => void = () => {};
	export let onLeave: () => void = () => {};

	let isOver: boolean = false;
	let input: HTMLInputElement;
	let selectedFiles: File[] = [];
	let pdfPreviews: { file: File; url: string }[] = [];

	const handleEnter = () => {
		isOver = true;
		if (onEnter) {
			onEnter();
		}
	};

	const handleLeave = () => {
		isOver = false;
		if (onLeave) {
			onLeave();
		}
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();

		if (!e?.dataTransfer?.items || disabled) {
			return;
		}
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
		const files: FileList = <FileList>(<HTMLInputElement>e.target).files;
		selectedFiles = Array.from(files);
		generatePdfPreviews(selectedFiles);
		onDrop(selectedFiles);
	};

	const generatePdfPreviews = (files: File[]) => {
		// Clean up previous previews
		pdfPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));

		// Generate new previews for PDF files
		pdfPreviews = files
			.filter((file) => file.type === 'application/pdf')
			.map((file) => ({
				file,
				url: URL.createObjectURL(file)
			}));
	};

	const onClick = () => {
		input.click();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			input.click();
		}
	};

	// Clean up object URLs when component is destroyed
	onDestroy(() => {
		pdfPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
	});
</script>

<form
	method="POST"
	use:enhance
	action="?/upload"
	class="flex flex-col gap-4 rounded-box bg-base-200 p-6 max-w-md content-center"
	enctype="multipart/form-data"
>
	<div
		id="zone"
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragenter={handleEnter}
		on:dragleave={handleLeave}
		on:click={onClick}
		on:keydown={onKeyDown}
		tabIndex={0}
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
		name="file"
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
					<iframe title="PDF Preview {i}" src={preview.url} class="pdf-iframe"></iframe>
				</div>
			{/each}
		</div>
	{/if}

	<button type="submit" class="btn btn-primary" disabled={selectedFiles.length === 0}>
		Submit PDF
	</button>
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
