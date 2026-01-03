<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import PdfViewer from '$lib/components/pdf/PdfViewer.svelte';

	let { data } = $props<{
		data: {
			presentations: {
				id: string;
				teamName: string;
				teamId: string;
				category: string;
				created: string;
				updated: string;
				presentationUrl: string;
				repo_link: string | null;
				video_link: string | null;
			}[];
			user: any;
			eventConfig: any;
		};
	}>();

	let selectedPresentationFiles = $state<File[]>([]);
	let showPresentationModal = $state(false);
	let currentTeamName = $state('');
	let presentations = $state(data.presentations);
	let isLoading = $state(false);
	let loadingPresentationId = $state<string | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(1);

	// Group presentations by category
	function getPresentationsByCategory(categoryKey: string) {
		return presentations.filter((p) => p.category === categoryKey);
	}

	// Function to open presentation in fullscreen
	async function openFullscreen(presentation: (typeof data.presentations)[0]) {
		if (presentation.presentationUrl) {
			try {
				// Show loading state
				isLoading = true;
				loadingPresentationId = presentation.id;

				// Convert URL to File object like in TeamCard
				const filename = presentation.presentationUrl.split('/').pop() || 'presentation.pdf';
				const response = await fetch(presentation.presentationUrl);
				const blob = await response.blob();
				const file = new File([blob], filename, { type: 'application/pdf' });

				selectedPresentationFiles = [file];
				currentTeamName = presentation.teamName;
				showPresentationModal = true;

				// Enter fullscreen mode after the component is rendered
				await tick();
				await enterFullscreen();
			} catch (err) {
				console.error('Error loading presentation:', err);
			} finally {
				// Hide loading state
				isLoading = false;
				loadingPresentationId = null;
			}
		}
	}

	let fullscreenContainer: HTMLElement | null = null;

	// Handle keyboard shortcuts
	onMount(() => {
		if (!browser) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && showPresentationModal) {
				exitFullscreen();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	// Function to enter fullscreen mode
	async function enterFullscreen() {
		if (fullscreenContainer && browser) {
			try {
				await fullscreenContainer.requestFullscreen();
			} catch (err) {
				console.error('Error attempting to enable fullscreen:', err);
			}
		}
	}

	// Function to exit fullscreen mode
	function exitFullscreen() {
		if (document.fullscreenElement && browser) {
			document.exitFullscreen();
		}
		showPresentationModal = false;
	}

	// Function to trigger download of presentation
	function downloadPresentation(presentation) {
		if (presentation.presentationUrl) {
			// Create a temporary anchor element to trigger the download
			const link = document.createElement('a');
			link.href = presentation.presentationUrl;
			// Try to get the filename from the URL, fallback to a default name
			const filename = presentation.presentationUrl.split('/').pop() || `presentation-${presentation.teamName}.pdf`;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	// Handle fullscreen change events
	onMount(() => {
		if (!browser) return;

		const handleFullscreenChange = () => {
			if (!document.fullscreenElement) {
				// User exited fullscreen through browser controls
				showPresentationModal = false;
			}
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	});
</script>

<!-- Main Presentations Gallery -->
<div class="presentations-gallery">
	<div class="gallery-header">
		<h1>Presentations</h1>
		<p>View all submitted presentations</p>
	</div>

	{#if presentations.length > 0}
		{#each data.eventConfig.categories as category}
			{@const categoryPresentations = getPresentationsByCategory(category.key)}
			{#if categoryPresentations.length > 0}
				<div class="category-section">
					<div class="category-header" style="border-color: {category.color}">
						<h2 style="color: {category.color}">{category.name}</h2>
						<span class="category-count">{categoryPresentations.length} teams</span>
					</div>
					<div class="presentations-grid">
						{#each categoryPresentations as presentation}
							<div
								class="presentation-card"
								style="--category-color: {category.color}"
								on:click={() => openFullscreen(presentation)}
							>
								<div class="card-content">
									<div class="card-header-row">
										<h3>{presentation.teamName}</h3>
										<span
											class="category-badge"
											style="background: color-mix(in srgb, {category.color} 20%, transparent); color: {category.color}; border: 1px solid color-mix(in srgb, {category.color} 30%, transparent);"
											>{category.name}</span
										>
									</div>
									<p class="team-id">Team ID: {presentation.teamId}</p>
									<p class="created-date">
										Submitted: {new Date(presentation.created).toLocaleDateString()}
									</p>
									<div class="links-container">
										<a
											href={presentation.repo_link}
											target="_blank"
											rel="noopener noreferrer"
											class="external-link repo-link"
											on:click|stopPropagation
										>
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path
													d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
												></path>
											</svg>
											Repository
										</a>
										<a
											href={presentation.video_link}
											target="_blank"
											rel="noopener noreferrer"
											class="external-link video-link"
											on:click|stopPropagation
										>
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<polygon points="5 3 19 12 5 21 5 3"></polygon>
											</svg>
											Video Demo
										</a>
									</div>
									<div class="card-actions">
										<button
											class="view-btn"
											disabled={loadingPresentationId === presentation.id}
										>
											{#if loadingPresentationId === presentation.id}
												<span class="loading-spinner"></span>
												Loading...
											{:else}
												<svg
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
												View
											{/if}
										</button>
										{#if presentation.presentationUrl}
											<button
												class="download-btn"
												on:click|stopPropagation={() => downloadPresentation(presentation)}
											>
												<svg
													width="20"
													height="20"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
													<polyline points="7,10 12,15 17,10"></polyline>
													<line x1="12" y1="15" x2="12" y2="3"></line>
												</svg>
												Download
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{:else}
		<div class="no-presentations">
			<h2>No presentations yet</h2>
			<p>There are no presentations submitted yet.</p>
		</div>
	{/if}
</div>

<!-- Fullscreen container for presentations -->
{#if showPresentationModal}
	<div
		class="fullscreen-presentation-container"
		bind:this={fullscreenContainer}
		on:click={exitFullscreen}
	>
		<div class="presentation-content" on:click|stopPropagation>
			<div class="presentation-header">
				<h2>Presentation: {currentTeamName}</h2>
				<div class="presentation-header-actions">
					<button
						class="download-fullscreen-btn"
						on:click|stopPropagation={() => {
							// Find current presentation to download
							const currentPresentation = presentations.find(p => p.teamName === currentTeamName);
							if (currentPresentation) {
								downloadPresentation(currentPresentation);
							}
						}}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7,10 12,15 17,10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
					</button>
					<button class="exit-fullscreen-btn" on:click={exitFullscreen}>
						<svg
							width="20"
							height="20"
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
			</div>

			{#if isLoading}
				<div class="loading-overlay-fullscreen">
					<div class="loading-spinner"></div>
					<p>Loading presentation...</p>
				</div>
			{/if}

			<PdfViewer
				files={selectedPresentationFiles}
				on:load={() => (isLoading = false)}
				on:pageChange={(e) => {
					currentPage = e.detail.currentPage;
					totalPages = e.detail.totalPages;
				}}
			/>
		</div>

		<!-- Info box with current page and exit instructions -->
		<!-- <div class="info-box"> -->
		<!-- 	<span class="page-info">Page {currentPage} of {totalPages}</span> -->
		<!-- 	<span class="exit-instruction">Press ESC to exit fullscreen</span> -->
		<!-- </div> -->
	</div>
{/if}

<style>
	.presentations-gallery {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		min-height: 100vh;
	}

	.gallery-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.gallery-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #7f7bff;
		margin-bottom: 0.5rem;
	}

	/* Category sections */
	.category-section {
		margin-bottom: 3rem;
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid;
	}

	.category-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.category-count {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
	}

	.card-header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.card-header-row h3 {
		margin-bottom: 0;
	}

	.category-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}

	.presentation-card:hover {
		border-color: color-mix(in srgb, var(--category-color) 40%, transparent);
		box-shadow: 0 10px 25px color-mix(in srgb, var(--category-color) 15%, transparent);
	}

	.presentations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.presentation-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.3s ease;
		backdrop-filter: blur(10px);
	}

	.presentation-card:hover {
		transform: translateY(-5px);
		background: rgba(127, 123, 255, 0.1);
		border-color: rgba(127, 123, 255, 0.3);
		box-shadow: 0 10px 25px rgba(127, 123, 255, 0.2);
	}

	.card-content h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f0f0f0;
		margin-bottom: 0.5rem;
	}

	.team-id {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.25rem;
	}

	.created-date {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 1rem;
	}

	.card-actions {
		display: flex;
		justify-content: flex-end;
	}

	.view-btn {
		background: linear-gradient(to right, #4df2ff, #7f7bff);
		color: #0f1322;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.view-btn:hover:not(:disabled) {
		transform: scale(1.05);
	}

	.view-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(15, 19, 34, 0.2);
		border-left-color: #0f1322;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.download-btn {
		background: linear-gradient(to right, #8b89cc, #7c79e5);
		color: #0f1322;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		margin-left: 0.5rem;
	}

	.download-btn:hover {
		transform: scale(1.05);
	}

	.links-container {
		display: flex;
		gap: 0.5rem;
		margin: 0.5rem 0;
		flex-wrap: wrap;
	}

	.external-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: white;
		border: none;
		padding: 0.3rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.repo-link {
		background: #6e5494; /* GitHub purple */
	}

	.repo-link:hover {
		background: #5c477e; /* Darker GitHub purple */
		text-decoration: none;
	}

	.video-link {
		background: #ff0000; /* YouTube red */
	}

	.video-link:hover {
		background: #cc0000; /* Darker YouTube red */
		text-decoration: none;
	}

	.no-presentations {
		text-align: center;
		padding: 4rem 2rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.no-presentations h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	svg {
		display: inline-block;
		vertical-align: middle;
	}

	/* Fullscreen presentation container */
	.fullscreen-presentation-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: #000;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.presentation-content {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.presentation-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.7);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.presentation-header h2 {
		font-size: 1.2rem;
		font-weight: 600;
		color: #f0f0f0;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.exit-fullscreen-btn {
		background: transparent;
		border: none;
		color: #f0f0f0;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.exit-fullscreen-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.presentation-header-actions {
		display: flex;
		gap: 0.25rem;
	}

	.download-fullscreen-btn {
		background: transparent;
		border: none;
		color: #f0f0f0;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.download-fullscreen-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Loading overlay for fullscreen */
	.loading-overlay-fullscreen {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	/* Info box */
	.info-box {
		position: absolute;
		bottom: 20px;
		left: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 10px 15px;
		border-radius: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 1000;
		font-size: 0.9rem;
	}

	.page-info {
		margin-right: 10px;
	}

	.exit-instruction {
		opacity: 0.8;
		font-size: 0.8rem;
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.presentations-grid {
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: 1rem;
		}
	}

	@media (max-width: 768px) {
		.presentations-gallery {
			padding: 1rem;
		}

		.presentations-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.presentation-card {
			padding: 1rem;
		}

		.presentation-header {
			padding: 0.75rem 1rem;
		}

		.presentation-header h2 {
			font-size: 1.25rem;
		}

		.info-box {
			flex-direction: column;
			gap: 5px;
			text-align: center;
		}

		.page-info,
		.exit-instruction {
			display: block;
			width: 100%;
		}

		.links-container {
			flex-direction: column;
			gap: 0.25rem;
		}

		.external-link {
			font-size: 0.7rem;
			padding: 0.2rem 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.presentations-gallery {
			padding: 0.5rem;
		}

		.presentation-card {
			padding: 0.75rem;
		}

		.card-content h3 {
			font-size: 1.1rem;
		}

		.view-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.8rem;
		}
	}
</style>

