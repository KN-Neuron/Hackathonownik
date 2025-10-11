<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PdfPreview } from './pdfTypes';
	import { loadPdfJs } from './pdfUtils';

	export let files: File[] = [];
	export let multiple: boolean = false;

	
	let pdfPreviews: PdfPreview[] = [];
	let initializingPreviews = false;
	let fullScreenIndex: number | null = null;
	let currentPage = 1;
	let totalPages = 0;

	function touch() {
		pdfPreviews = [...pdfPreviews];
	}

	
	$: if (files) {
		initFromFiles(files);
	}

	async function initFromFiles(list: File[]) {
		initializingPreviews = true;
		pdfPreviews = [];
		if (!list.length) {
			initializingPreviews = false;
			return;
		}
		try {
			const pdfjs = await loadPdfJs();
			const pre: PdfPreview[] = [];
			for (const file of list) {
				try {
					const buffer = await file.arrayBuffer();
					const task = pdfjs.getDocument({ data: buffer });
					const pdf = await task.promise;
					totalPages = pdf.numPages;
					pre.push({
						file,
						pdf,
						pageCount: pdf.numPages,
						currentPage: 1,
						displayedPage: 1,
						pageCache: Array(pdf.numPages + 1).fill(null),
						isRendering: false,
						buffer
					});
				} catch (err: any) {
					pre.push({
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
			pdfPreviews = pre;
			if (browser) {
				for (const p of pdfPreviews) {
					if (p.pdf && p.pageCount > 0) void ensureRendered(p, 1);
				}
			}
		} finally {
			initializingPreviews = false;
		}
	}

	async function ensureRendered(preview: PdfPreview, pageNumber: number) {
		if (!browser || !preview.pdf) return;
		if (preview.pageCache[pageNumber]) {
			if (preview.currentPage === pageNumber && preview.displayedPage !== pageNumber) {
				preview.displayedPage = pageNumber;
				currentPage = pageNumber;
				touch();
			}
			return;
		}
		if (preview.isRendering) return;

		preview.isRendering = true;
		touch();

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
				currentPage = pageNumber;
			}
			touch();
		} catch (e) {
			console.warn('Render error page', pageNumber, e);
			preview.pageCache[pageNumber] = null;
			touch();
		} finally {
			preview.isRendering = false;
			touch();
		}
	}

	function goToPage(preview: PdfPreview, page: number) {
		if (!preview.pdf) return;
		if (page < 1 || page > preview.pageCount) return;
		preview.currentPage = page;
		currentPage = page;
		touch();
		if (preview.pageCache[page]) {
			preview.displayedPage = page;
			touch();
		} else {
			void ensureRendered(preview, page);
		}
	}

	function toggleFullscreen(index: number) {
		fullScreenIndex = fullScreenIndex === index ? null : index;
	}

	function closeFullscreen() {
		fullScreenIndex = null;
	}

	function handleKey(e: KeyboardEvent) {
		if (!browser) return;
		const activeTag = (document.activeElement?.tagName || '').toLowerCase();
		if (['input', 'textarea', 'select'].includes(activeTag)) return;

		if (fullScreenIndex !== null) {
			const p = pdfPreviews[fullScreenIndex];
			if (!p) return;
			if (e.key === 'ArrowRight') goToPage(p, p.currentPage + 1);
			else if (e.key === 'ArrowLeft') goToPage(p, p.currentPage - 1);
			else if (e.key === 'Escape') closeFullscreen();
			return;
		}

		if (pdfPreviews.length === 0) return;
		const first = pdfPreviews[0];
		if (e.key === 'ArrowRight') goToPage(first, first.currentPage + 1);
		else if (e.key === 'ArrowLeft') goToPage(first, first.currentPage - 1);
	}

	function handlePageInput(event: Event, preview: PdfPreview) {
		const input = event.target as HTMLInputElement;
		const page = parseInt(input.value);
		if (!isNaN(page) && page >= 1 && page <= preview.pageCount) {
			goToPage(preview, page);
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKey);
	});

	onDestroy(() => {
		if (browser) window.removeEventListener('keydown', handleKey);
	});
</script>

<div class="preview-container">
	{#if initializingPreviews}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading presentation...</p>
		</div>
	{:else if !pdfPreviews.length}
		<div class="empty-state">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="64"
				height="64"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<line x1="16" y1="13" x2="8" y2="13"></line>
				<line x1="16" y1="17" x2="8" y2="17"></line>
				<line x1="10" y1="9" x2="8" y2="9"></line>
			</svg>
			<p>No PDF loaded yet</p>
		</div>
	{/if}

	{#if pdfPreviews.length > 0}
		<div class="pdf-viewer">
			{#each pdfPreviews as preview, idx}
				<div class="pdf-document">
					<div class="pdf-header">
						<h3 class="pdf-title">{preview.file.name}</h3>
						<div class="pdf-controls">
							{#if preview.pageCount > 0}
								<div class="page-controls">
									<button
										class="btn-icon"
										disabled={currentPage <= 1 || preview.isRendering}
										on:click={() => goToPage(preview, preview.currentPage - 1)}
									>
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<polyline points="15 18 9 12 15 6"></polyline>
										</svg>
									</button>

									<div class="page-input">
										<input
											type="number"
											value={currentPage}
											min="1"
											max={preview.pageCount}
											on:change={(e) => handlePageInput(e, preview)}
										/>
										<span> / {preview.pageCount}</span>
									</div>

									<button
										class="btn-icon"
										disabled={currentPage >= preview.pageCount || preview.isRendering}
										on:click={() => goToPage(preview, preview.currentPage + 1)}
									>
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<polyline points="9 18 15 12 9 6"></polyline>
										</svg>
									</button>
								</div>
							{/if}

							<button class="btn" on:click={() => toggleFullscreen(idx)}>
								{fullScreenIndex === idx ? 'Exit Fullscreen' : 'Fullscreen'}
							</button>
						</div>
					</div>

					{#if preview.error}
						<div class="error-message">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="12" cy="12" r="10"></circle>
								<line x1="12" y1="8" x2="12" y2="12"></line>
								<line x1="12" y1="16" x2="12.01" y2="16"></line>
							</svg>
							<p>{preview.error}</p>
						</div>
					{:else}
						<div class="pdf-content">
							<button
								class="nav-arrow left"
								disabled={currentPage <= 1 || preview.isRendering}
								on:click={() => goToPage(preview, preview.currentPage - 1)}
							>
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="15 18 9 12 15 6"></polyline>
								</svg>
							</button>

							<div class="page-container">
								{#if preview.pageCache[preview.displayedPage]}
									<img
										src={preview.pageCache[preview.displayedPage]}
										alt="PDF page {preview.displayedPage}"
										class="page-image"
									/>
									{#if preview.isRendering && preview.currentPage !== preview.displayedPage}
										<div class="loading-overlay">
											<div class="loading-spinner"></div>
										</div>
									{/if}
								{:else}
									<div class="loading-placeholder">
										<div class="loading-spinner"></div>
										<p>Loading page...</p>
									</div>
								{/if}
							</div>

							<button
								class="nav-arrow right"
								disabled={currentPage >= preview.pageCount || preview.isRendering}
								on:click={() => goToPage(preview, preview.currentPage + 1)}
							>
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</button>
						</div>
					{/if}

					<div class="pdf-footer">
						<p class="keyboard-hint">
							Use keyboard arrows ← → or navigation buttons to change pages
						</p>
						{#if multiple && pdfPreviews.length > 1}
							<span class="document-counter">Document {idx + 1} of {pdfPreviews.length}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if fullScreenIndex !== null}
	{@const preview = pdfPreviews[fullScreenIndex]}
	<div class="fullscreen-overlay">
		<button class="close-button" on:click={closeFullscreen}>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<div class="fullscreen-content">
			<button
				class="fs-nav-arrow left"
				disabled={preview.currentPage <= 1 || preview.isRendering}
				on:click={() => goToPage(preview, preview.currentPage - 1)}
			>
				<svg
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>

			{#if preview.pageCache[preview.displayedPage]}
				<img
					src={preview.pageCache[preview.displayedPage]}
					alt="PDF page {preview.displayedPage} fullscreen"
					class="fullscreen-image"
				/>
			{:else}
				<div class="loading-placeholder fullscreen">
					<div class="loading-spinner"></div>
					<p>Loading page...</p>
				</div>
			{/if}

			<button
				class="fs-nav-arrow right"
				disabled={preview.currentPage >= preview.pageCount || preview.isRendering}
				on:click={() => goToPage(preview, preview.currentPage + 1)}
			>
				<svg
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>
		</div>

		<div class="fullscreen-controls">
			<div class="page-display">
				Page {preview.displayedPage} of {preview.pageCount}
			</div>

			<div class="fullscreen-nav">
				<button
					class="btn-sm"
					disabled={preview.currentPage <= 1}
					on:click={() => goToPage(preview, 1)}
				>
					First
				</button>

				<div class="page-jump">
					<input
						type="number"
						value={currentPage}
						min="1"
						max={preview.pageCount}
						on:change={(e) => handlePageInput(e, preview)}
					/>
					<button class="btn-sm" on:click={(e) => handlePageInput(e, preview)}>Go</button>
				</div>

				<button
					class="btn-sm"
					disabled={preview.currentPage >= preview.pageCount}
					on:click={() => goToPage(preview, preview.pageCount)}
				>
					Last
				</button>
			</div>

			<p class="keyboard-hint">Press ESC to exit fullscreen</p>
		</div>
	</div>
{/if}

<style>
	.preview-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.loading-container,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 300px;
		width: 100%;
		color: #999;
	}

	.empty-state svg {
		opacity: 0.6;
		margin-bottom: 1rem;
	}

	.pdf-viewer {
		width: 100%;
		max-width: 1000px;
	}

	.pdf-document {
		display: flex;
		flex-direction: column;
		margin-bottom: 2rem;
	}

	.pdf-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.pdf-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #f0f0f0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 60%;
	}

	.pdf-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.page-controls {
		display: flex;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 0.25rem;
	}

	.btn-icon {
		background: none;
		border: none;
		color: #f0f0f0;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.btn-icon:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.page-input {
		display: flex;
		align-items: center;
		margin: 0 0.5rem;
		font-size: 0.9rem;
	}

	.page-input input {
		width: 40px;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		color: white;
		padding: 0.25rem;
		text-align: center;
		margin-right: 0.25rem;
	}

	.btn {
		background-color: rgba(255, 255, 255, 0.1);
		border: none;
		color: white;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	.btn:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.pdf-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.page-container {
		position: relative;
		background-color: #2c2e33;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		width: 100%;
		overflow: hidden;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.page-image {
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
	}

	.nav-arrow {
		position: absolute;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		border: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
		transition: background-color 0.2s;
	}

	.nav-arrow:hover:not(:disabled) {
		background-color: rgba(0, 0, 0, 0.8);
	}

	.nav-arrow:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.nav-arrow.left {
		left: 1rem;
	}

	.nav-arrow.right {
		right: 1rem;
	}

	.loading-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 400px;
		color: #999;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border-top-color: #3b82f6;
		animation: spin 1s ease-in-out infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}

	.pdf-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #999;
		font-size: 0.8rem;
	}

	.keyboard-hint {
		margin: 0;
	}

	.document-counter {
		padding: 0.25rem 0.5rem;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

		.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background-color: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: 8px;
		color: #ff8080;
		margin-bottom: 1rem;
	}

	.error-message svg {
		margin-right: 0.5rem;
		color: #ff6060;
	}

	.fullscreen-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.95);
		z-index: 10000;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background-color: rgba(255, 255, 255, 0.1);
		color: white;
		border: none;
		width: 40px;
		height: 40px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10010;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.fullscreen-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding: 2rem;
	}

	.fullscreen-image {
		max-width: 95vw;
		max-height: 80vh;
		object-fit: contain;
		box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
	}

	.fs-nav-arrow {
		position: absolute;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		border: none;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 1010;
		transition: background-color 0.2s;
	}

	.fs-nav-arrow:hover:not(:disabled) {
		background-color: rgba(0, 0, 0, 0.8);
	}

	.fs-nav-arrow:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.fs-nav-arrow.left {
		left: 2rem;
	}

	.fs-nav-arrow.right {
		right: 2rem;
	}

	.fullscreen-controls {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgba(0, 0, 0, 0.7);
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.page-display {
		color: white;
		font-size: 0.9rem;
	}

	.fullscreen-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.page-jump {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-jump input {
		width: 50px;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: white;
		padding: 0.25rem 0.5rem;
		text-align: center;
	}

	.btn-sm {
		background-color: rgba(255, 255, 255, 0.15);
		border: none;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.btn-sm:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.25);
	}

	.btn-sm:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.loading-placeholder.fullscreen {
		height: 70vh;
	}

		@media (max-width: 768px) {
		.pdf-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.pdf-title {
			max-width: 100%;
		}

		.pdf-controls {
			width: 100%;
			justify-content: space-between;
		}

		.fs-nav-arrow {
			width: 40px;
			height: 40px;
		}

		.fs-nav-arrow.left {
			left: 1rem;
		}

		.fs-nav-arrow.right {
			right: 1rem;
		}
	}
</style>
