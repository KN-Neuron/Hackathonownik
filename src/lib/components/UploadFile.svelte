<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
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
		pdf: any | null;
		pageCount: number;
		currentPage: number;      // target page requested
		displayedPage: number;    // currently visible page
		pageCache: (string | null)[];
		error?: string;
		isRendering: boolean;
		buffer?: ArrayBuffer;
	};

	let pdfPreviews: PdfPreview[] = [];
	let initializingPreviews = false;

	// Upload state
	let loading = false;
	let errorMessage = '';
	let successMessage = '';
	const uploadUrl = '?/upload';

	// Fullscreen
	let fullScreenIndex: number | null = null;

	let pdfjsLibPromise: Promise<any> | null = null;
	async function loadPdfJs() {
		if (!pdfjsLibPromise) {
			pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf');
			const pdfjs = await pdfjsLibPromise;
			if (browser) {
				try {
					const worker = await import('pdfjs-dist/build/pdf.worker?url');
					pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
				} catch {
					pdfjs.GlobalWorkerOptions.workerSrc =
						'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
				}
			}
			return pdfjs;
		}
		return pdfjsLibPromise;
	}

	function handleEnter() { isOver = true; onEnter?.(); }
	function handleLeave() { isOver = false; onLeave?.(); }
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!e?.dataTransfer?.files || disabled) return;
		const items = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
		selectedFiles = items;
		initializePdfPreviews(selectedFiles);
		onDrop(items);
		isOver = false;
	}
	function handleDragOver(e: Event) { e.preventDefault(); }
	function handleChange(e: Event) {
		e.preventDefault();
		const files = (e.target as HTMLInputElement).files;
		if (!files) return;
		const items = Array.from(files).filter(f => f.type === 'application/pdf');
		selectedFiles = items;
		initializePdfPreviews(selectedFiles);
		onDrop(items);
	}
	function onClick() { if (!disabled) input?.click(); }
	function onKeyDown(e: KeyboardEvent) { if (e.key === 'Enter') onClick(); }

	function touchPreview(_p: PdfPreview) {
		pdfPreviews = [...pdfPreviews];
	}

	async function initializePdfPreviews(files: File[]) {
		if (!files.length) {
			pdfPreviews = [];
			return;
		}
		initializingPreviews = true;
		pdfPreviews = [];
		try {
			const pdfjs = await loadPdfJs();
			const previews: PdfPreview[] = [];
			for (const file of files) {
				try {
					const buffer = await file.arrayBuffer();
					const task = pdfjs.getDocument({ data: buffer });
					const pdf = await task.promise;
					const pageCount = pdf.numPages;
					previews.push({
						file,
						pdf,
						pageCount,
						currentPage: 1,
						displayedPage: 1,
						pageCache: Array(pageCount + 1).fill(null),
						isRendering: false,
						buffer
					});
				} catch (err: any) {
					previews.push({
						file,
						pdf: null,
						pageCount: 0,
						currentPage: 0,
						displayedPage: 0,
						pageCache: [],
						isRendering: false,
						error: err?.message || 'Failed to load PDF'
					});
				}
			}
			pdfPreviews = previews;
			if (browser) {
				for (const p of pdfPreviews) {
					if (p.pdf && p.pageCount > 0) void ensurePageRendered(p, 1);
				}
			}
		} finally {
			initializingPreviews = false;
		}
	}

	async function ensurePageRendered(preview: PdfPreview, pageNumber: number) {
		if (!browser || !preview.pdf) return;
		if (preview.pageCache[pageNumber]) {
			if (preview.currentPage === pageNumber && preview.displayedPage !== pageNumber) {
				preview.displayedPage = pageNumber;
				touchPreview(preview);
			}
			return;
		}
		if (preview.isRendering) return;

		preview.isRendering = true;
		touchPreview(preview);

		try {
			const page = await preview.pdf.getPage(pageNumber);
			const baseViewport = page.getViewport({ scale: 1 });
			const targetWidth = Math.min(window.innerWidth * 0.9, 1100);
			const scale = Math.min(2.0, targetWidth / baseViewport.width);
			const viewport = page.getViewport({ scale });

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			await page.render({ canvasContext: ctx!, viewport }).promise;

			preview.pageCache[pageNumber] = canvas.toDataURL('image/png');
			if (preview.currentPage === pageNumber) {
				preview.displayedPage = pageNumber;
			}
			touchPreview(preview);
		} catch (e) {
			console.warn('Render error page', pageNumber, e);
			preview.pageCache[pageNumber] = null;
			touchPreview(preview);
		} finally {
			preview.isRendering = false;
			touchPreview(preview);
		}
	}

	function goToPage(preview: PdfPreview, target: number) {
		if (!preview.pdf) return;
		if (target < 1 || target > preview.pageCount) return;

		preview.currentPage = target;
		touchPreview(preview);

		if (preview.pageCache[target]) {
			preview.displayedPage = target;
			touchPreview(preview);
		} else {
			void ensurePageRendered(preview, target);
		}
	}

	function toggleFullScreen(index: number) {
		fullScreenIndex = fullScreenIndex === index ? null : index;
	}

	function closeFullScreen() { fullScreenIndex = null; }

	async function handleSubmit() {
		if (loading || disabled || selectedFiles.length === 0) return;
		loading = true;
		errorMessage = '';
		successMessage = '';
		try {
			const formData = new FormData();
			if (multiple) {
				selectedFiles.forEach(file => formData.append('files', file));
			} else {
				formData.append('file', selectedFiles[0]);
			}
			const res = await fetch(uploadUrl, { method: 'POST', body: formData });
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

	function handleGlobalKey(e: KeyboardEvent) {
		if (!browser) return;
		const tag = (document.activeElement?.tagName || '').toLowerCase();
		if (['input', 'textarea', 'select'].includes(tag) || (document.activeElement as HTMLElement)?.isContentEditable) return;

		if (fullScreenIndex !== null) {
			const p = pdfPreviews[fullScreenIndex];
			if (!p) return;
			if (e.key === 'ArrowRight') goToPage(p, p.currentPage + 1);
			else if (e.key === 'ArrowLeft') goToPage(p, p.currentPage - 1);
			else if (e.key === 'Escape') closeFullScreen();
			return;
		}

		if (pdfPreviews.length === 0) return;
		const first = pdfPreviews[0];
		if (e.key === 'ArrowRight') goToPage(first, first.currentPage + 1);
		else if (e.key === 'ArrowLeft') goToPage(first, first.currentPage - 1);
	}

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKey);
	});
	onDestroy(() => {
		if (browser) window.removeEventListener('keydown', handleGlobalKey);
	});
</script>

<!-- Layout container -->
<div class="uploader-layout flex flex-col md:flex-row gap-6 items-stretch max-w-[1500px] mx-auto">

	<!-- LEFT: Upload Panel -->
	<form
		class="upload-panel flex flex-col gap-4 rounded-box bg-base-200 p-5 md:p-6 w-full md:w-80 lg:w-96 mx-auto md:mx-0 md:shrink-0 md:sticky md:top-4 h-fit"
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
				<p class="font-medium mb-1 text-sm">Selected files:</p>
				<ul class="text-xs space-y-1">
					{#each selectedFiles as file}
						<li>
							{file.name}
							(<span class="opacity-70">{Math.round(file.size / 1024)} KB</span>)
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<button
			type="submit"
			class="btn btn-primary justify-center mt-1"
			disabled={selectedFiles.length === 0 || loading || disabled}
			on:click|preventDefault={handleSubmit}
		>
			{#if loading}
				<span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
				Uploading...
			{:else}
				Submit PDF
			{/if}
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

		{#if initializingPreviews}
			<p class="text-xs opacity-70 mt-1">Preparing PDFs...</p>
		{/if}

		<!-- Helper text -->
		<p class="text-[11px] leading-snug opacity-60 mt-2">
			Drag & drop a PDF or click the area above. Use left/right arrows to navigate pages. Fullscreen available per file.
		</p>
	</form>

	<!-- RIGHT: Preview Panel -->
	<div class="preview-panel flex-1 flex flex-col gap-8 md:pr-2">
		{#if !initializingPreviews && pdfPreviews.length === 0}
			<div class="text-sm opacity-60 border border-dashed border-base-300 rounded-box p-6 text-center">
				No preview yet. Add a PDF on the left.
			</div>
		{/if}

		{#if pdfPreviews.length > 0}
			<div class="flex flex-col gap-10">
				{#each pdfPreviews as preview, idx}
					<div class="flex flex-col items-center gap-3 w-full">
						<!-- Header row -->
						<div class="w-full flex justify-between items-center">
							<h4 class="font-semibold text-sm truncate pr-2">{preview.file.name}</h4>
							<div class="flex items-center gap-3 text-xs opacity-70">
								{#if preview.pageCount > 0}
									<span>Page {preview.displayedPage}/{preview.pageCount}</span>
								{/if}
								<button
									type="button"
									class="btn btn-xs btn-ghost"
									on:click={() => toggleFullScreen(idx)}
								>
									{fullScreenIndex === idx ? 'Exit' : 'Fullscreen'}
								</button>
							</div>
						</div>

						{#if preview.error}
							<div class="alert alert-error w-full max-w-[90vw] md:max-w-[1100px]">
								{preview.error}
							</div>
						{:else}
							<div class="pdf-viewer-wrapper relative flex items-center justify-center w-full">
								<button
									type="button"
									class="nav-arrow left"
									aria-label="Previous page"
									disabled={preview.currentPage <= 1 || preview.isRendering}
									on:click={() => goToPage(preview, preview.currentPage - 1)}
								>
									<span>&larr;</span>
								</button>

								<div class="pdf-canvas-container">
									{#if preview.pageCache[preview.displayedPage]}
										<img
											src={preview.pageCache[preview.displayedPage] as string}
											alt={"Page " + preview.displayedPage + " of " + preview.file.name}
											class="pdf-page-image"
											draggable="false"
										/>
										{#if preview.isRendering && preview.currentPage !== preview.displayedPage}
											<div class="overlay-spinner">
												<div class="loading loading-spinner loading-sm"></div>
											</div>
										{/if}
									{:else}
										<div class="placeholder-box">
											<span class="text-[10px] opacity-60 tracking-wide">Loading page...</span>
										</div>
									{/if}
								</div>

								<button
									type="button"
									class="nav-arrow right"
									aria-label="Next page"
									disabled={preview.currentPage >= preview.pageCount || preview.isRendering}
									on:click={() => goToPage(preview, preview.currentPage + 1)}
								>
									<span>&rarr;</span>
								</button>
							</div>

							<div class="flex gap-3 items-center text-xs opacity-70">
								<span>Use arrows or keyboard ← →</span>
								{#if multiple && pdfPreviews.length > 1}
									<span class="badge badge-outline badge-xs">File {idx + 1}/{pdfPreviews.length}</span>
								{/if}
								{#if preview.isRendering && preview.currentPage !== preview.displayedPage}
									<span class="opacity-60 italic">Rendering next page…</span>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen Overlay -->
{#if fullScreenIndex !== null}
	{@const preview = pdfPreviews[fullScreenIndex]}
	<div class="fullscreen-overlay">
		<button
			class="fs-close"
			aria-label="Close fullscreen"
			on:click={closeFullScreen}
		>&times;</button>

		<button
			type="button"
			class="nav-arrow left fs"
			aria-label="Previous page"
			disabled={preview.currentPage <= 1 || preview.isRendering}
			on:click={() => goToPage(preview, preview.currentPage - 1)}
		>
			<span>&larr;</span>
		</button>

		<div class="fs-stage">
			{#if preview.pageCache[preview.displayedPage]}
				<img
					src={preview.pageCache[preview.displayedPage] as string}
					alt={"Fullscreen page " + preview.displayedPage}
					class="fs-image"
					draggable="false"
				/>
				{#if preview.isRendering && preview.currentPage !== preview.displayedPage}
					<div class="fs-overlay-spinner">
						<div class="loading loading-spinner loading-lg"></div>
					</div>
				{/if}
			{:else}
				<div class="fs-placeholder">
					<span class="text-xs opacity-70">Loading...</span>
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="nav-arrow right fs"
			aria-label="Next page"
			disabled={preview.currentPage >= preview.pageCount || preview.isRendering}
			on:click={() => goToPage(preview, preview.currentPage + 1)}
		>
			<span>&rarr;</span>
		</button>

		<div class="fs-page-indicator">
			Page {preview.displayedPage} / {preview.pageCount}
			{#if preview.isRendering && preview.currentPage !== preview.displayedPage}
				<span class="ml-2 opacity-70">(rendering {preview.currentPage})</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Shared / existing styles (trimmed for clarity – keep your previous theme as needed) */

	#hidden-input { display: none; }
	#fallback {
		display: grid;
		align-items: center;
		width: 100%;
		height: 180px;
		border: 2px dashed #9ca3af;
		border-radius: 10px;
		transition: all 0.2s ease-in-out;
	}
	#fallback.active {
		border-color: #3b82f6;
		background-color: rgba(59,130,246,0.1);
	}
	#fallback :global(svg) { margin: auto; max-width: 100%; max-height: 100%; }

	.selected-files {
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background-color: color-mix(in srgb, currentColor 6%, transparent);
	}

	.pdf-canvas-container {
		position: relative;
		width: min(90vw, 1100px);
		aspect-ratio: 0.707;
		background: var(--fallback-b1, #1f2937);
		border: 1px solid var(--fallback-b3, #374151);
		border-radius: 0.75rem;
		padding: 0.35rem;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		box-shadow: 0 4px 16px rgba(0,0,0,0.2);
	}

	.pdf-page-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		user-select: none;
		border-radius: 0.4rem;
		box-shadow: 0 2px 8px rgba(0,0,0,0.25);
	}

	.placeholder-box {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #aaa;
		font-style: italic;
		font-size: 0.7rem;
	}

	.overlay-spinner,
	.fs-overlay-spinner {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.25);
		backdrop-filter: blur(1px);
	}

	.nav-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0,0,0,0.45);
		color: #fff;
		border: none;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1.1rem;
		font-weight: 600;
		transition: background 0.15s ease, transform 0.15s ease;
		z-index: 5;
	}
	.nav-arrow:hover:not(:disabled) { background: rgba(0,0,0,0.65); }
	.nav-arrow:active:not(:disabled) { transform: translateY(-50%) scale(0.9); }
	.nav-arrow:disabled { opacity: 0.35; cursor: default; }
	.nav-arrow.left { left: 0.5rem; }
	.nav-arrow.right { right: 0.5rem; }

	.fullscreen-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0,0,0,0.88);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fs-stage {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fs-image {
		max-width: calc(100vw - 8rem);
		max-height: calc(100vh - 4rem);
		object-fit: contain;
		user-select: none;
		border-radius: 0.4rem;
		box-shadow: 0 4px 28px rgba(0,0,0,0.55);
	}

	.fs-placeholder {
		width: 60vw;
		max-width: 1000px;
		min-height: 50vh;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #bbb;
		background: #222;
		border: 1px solid #444;
		border-radius: 0.75rem;
	}

	.nav-arrow.fs { position: fixed; }
	.nav-arrow.fs.left { left: clamp(0.5rem, 2vw, 2rem); }
	.nav-arrow.fs.right { right: clamp(0.5rem, 2vw, 2rem); }

	.fs-close {
		position: fixed;
		top: 0.75rem;
		right: 0.9rem;
		background: rgba(0,0,0,0.5);
		color: #fff;
		border: none;
		width: 40px;
		height: 40px;
		font-size: 1.4rem;
		line-height: 1;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0,0,0,0.4);
		transition: background 0.15s;
		z-index: 1010;
	}
	.fs-close:hover { background: rgba(0,0,0,0.7); }

	.fs-page-indicator {
		position: fixed;
		bottom: 0.85rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0,0,0,0.55);
		color: #fff;
		font-size: 0.7rem;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		letter-spacing: 0.5px;
		font-weight: 500;
		backdrop-filter: blur(3px);
	}

	@media (max-width: 900px) {
		.pdf-canvas-container { width: 94vw; }
		.nav-arrow { width: 38px; height: 38px; font-size: 1rem; }
		.fs-image { max-width: calc(100vw - 4rem); max-height: calc(100vh - 3rem); }
		.fs-close { width: 38px; height: 38px; font-size: 1.25rem; }
	}
</style>
