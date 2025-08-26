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

	type PdfPreview = {
		file: File;
		pages: string[];       // data URLs (PNG) for rendered pages
		pageCount: number;
		error?: string;
	};

	let pdfPreviews: PdfPreview[] = [];
	let renderingPreviews = false;

	// Submission state
	let loading = false;
	let errorMessage = '';
	let successMessage = '';
	const uploadUrl = '?/upload';

	/**
	 * Lazy-load pdf.js only when needed to keep initial bundle small.
	 * Using legacy build for broader browser support. Adjust path if you installed a different version.
	 */
	let pdfjsLibPromise: Promise<any> | null = null;
	async function loadPdfJs() {
		if (!pdfjsLibPromise) {
			pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf');
			const pdfjs = await pdfjsLibPromise;
			// Worker – use ?url approach if bundler supports, otherwise CDN fallback
			try {
				const worker = await import('pdfjs-dist/build/pdf.worker?url');
				pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
			} catch {
				// Fallback (make sure version matches your installed package)
				pdfjs.GlobalWorkerOptions.workerSrc =
					'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
			}
			return pdfjs;
		}
		return pdfjsLibPromise;
	}

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

		const items = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf');
		selectedFiles = items;
		generatePdfPreviews(selectedFiles);
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
		const items = Array.from(files).filter((f) => f.type === 'application/pdf');
		selectedFiles = items;
		generatePdfPreviews(selectedFiles);
		onDrop(items);
	};

	const onClick = () => {
		if (!disabled) input.click();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') onClick();
	};

	async function renderSinglePdf(file: File, maxPages = 2): Promise<PdfPreview> {
		try {
			const pdfjs = await loadPdfJs();
			const buffer = await file.arrayBuffer();
			const loadingTask = pdfjs.getDocument({ data: buffer });
			const pdf = await loadingTask.promise;

			const pages: string[] = [];
			const pagesToRender = Math.min(pdf.numPages, maxPages);

			for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
				const page = await pdf.getPage(pageNum);
				const viewport = page.getViewport({ scale: 1.0 });

				// Scale down large pages to a comfortable width
				const targetWidth = 480;
				const scale = Math.min(1.5, targetWidth / viewport.width);
				const scaledViewport = page.getViewport({ scale });

				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				canvas.width = scaledViewport.width;
				canvas.height = scaledViewport.height;

				await page.render({
					canvasContext: ctx,
					viewport: scaledViewport
				}).promise;

				const dataUrl = canvas.toDataURL('image/png');
				pages.push(dataUrl);
			}

			return { file, pages, pageCount: pdf.numPages };
		} catch (e: any) {
			return { file, pages: [], pageCount: 0, error: e?.message || 'Failed to render PDF' };
		}
	}

	async function generatePdfPreviews(files: File[]) {
		renderingPreviews = true;
		pdfPreviews = [];
		try {
			const previews: PdfPreview[] = [];
			for (const f of files) {
				const preview = await renderSinglePdf(f);
				previews.push(preview);
			}
			pdfPreviews = previews;
		} finally {
			renderingPreviews = false;
		}
	}

	async function handleSubmit() {
		if (loading || disabled || selectedFiles.length === 0) return;

		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
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
		// Nothing special to revoke; canvases were converted to data URLs (garbage collected)
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
					<li>
						{file.name}
						(<span class="opacity-70">{Math.round(file.size / 1024)} KB</span>)
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Integrated PDF previews (no iframes) -->
	{#if renderingPreviews}
		<div class="flex flex-col gap-2">
			<div class="skeleton h-48 w-full rounded-box"></div>
			{#if multiple}
				<div class="skeleton h-48 w-full rounded-box"></div>
			{/if}
			<p class="text-sm opacity-70">Rendering previews...</p>
		</div>
	{:else if pdfPreviews.length > 0}
		<div class="flex flex-col gap-6 mt-2">
			{#each pdfPreviews as preview}
				<div class="bg-base-100 rounded-box shadow p-3 border border-base-300 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h4 class="font-medium text-sm">{preview.file.name}</h4>
						<span class="badge badge-neutral badge-sm">
							{preview.pageCount} page{preview.pageCount === 1 ? '' : 's'}
						</span>
					</div>

					{#if preview.error}
						<div class="alert alert-error py-2 px-3 text-xs">
							{preview.error}
						</div>
					{:else}
						<div class="flex flex-col gap-4">
							{#each preview.pages as page, i}
								<div class="flex flex-col gap-1">
									<div class="text-xs opacity-60 flex items-center gap-2">
										<span class="badge badge-outline badge-xs">Page {i + 1}</span>
									</div>
									<!-- Display rendered page as image -->
									<img
										src={page}
										alt={"Preview page " + (i + 1) + " of " + preview.file.name}
										class="w-full rounded-md border border-base-300 shadow-sm"
										loading="lazy"
									/>
								</div>
							{/each}

							{#if preview.pageCount > preview.pages.length}
								<div class="flex items-center gap-2">
									<span class="text-xs opacity-70">
										Only first {preview.pages.length} page{preview.pages.length === 1 ? '' : 's'} rendered.
									</span>
									<button
										type="button"
										class="btn btn-xs btn-ghost"
										on:click={async () => {
											// Render all remaining pages on demand
											const pdfjs = await loadPdfJs();
											const buffer = await preview.file.arrayBuffer();
											const loadingTask = pdfjs.getDocument({ data: buffer });
											const pdf = await loadingTask.promise;
											for (let pageNum = preview.pages.length + 1; pageNum <= pdf.numPages; pageNum++) {
												const page = await pdf.getPage(pageNum);
												const viewport = page.getViewport({ scale: 1.0 });
												const targetWidth = 480;
												const scale = Math.min(1.5, targetWidth / viewport.width);
												const scaledViewport = page.getViewport({ scale });

												const canvas = document.createElement('canvas');
												const ctx = canvas.getContext('2d');
												canvas.width = scaledViewport.width;
												canvas.height = scaledViewport.height;

												await page.render({
													canvasContext: ctx,
													viewport: scaledViewport
												}).promise;

												const dataUrl = canvas.toDataURL('image/png');
												preview.pages = [...preview.pages, dataUrl];
											}
										}}
									>
										Render all pages
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<button
		type="submit"
		class="btn btn-primary justify-center mt-2"
		disabled={selectedFiles.length === 0 || loading || disabled}
		on:click|preventDefault={handleSubmit}
	>
		{#if loading}
			<span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
		{/if}
		Submit PDF
	</button>

	{#if errorMessage}
		<div class="alert alert-error mt-3 text-sm">
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert alert-success mt-3 text-sm">
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
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background-color: color-mix(in srgb, currentColor 6%, transparent);
	}
	.selected-files ul {
		list-style: none;
		margin: 0;
		padding-left: 0.75rem;
	}
</style>
