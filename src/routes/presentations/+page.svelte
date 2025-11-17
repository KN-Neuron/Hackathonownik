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
				created: string;
				updated: string;
				presentationUrl: string;
			}[];
			user: any;
		};
	}>();

	let selectedPresentationFiles = $state<File[]>([]);
	let showPresentationModal = $state(false);
	let currentTeamName = $state('');
	let presentations = $state(data.presentations);

	// Function to open presentation in fullscreen
	async function openFullscreen(presentation: typeof data.presentations[0]) {
		if (presentation.presentationUrl) {
			try {
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
		<div class="presentations-grid">
			{#each presentations as presentation}
				<div class="presentation-card" on:click={() => openFullscreen(presentation)}>
					<div class="card-content">
						<h3>{presentation.teamName}</h3>
						<p class="team-id">Team ID: {presentation.teamId}</p>
						<p class="created-date">Submitted: {new Date(presentation.created).toLocaleDateString()}</p>
						<div class="card-actions">
							<button class="view-btn">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
								View
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="no-presentations">
			<h2>No presentations yet</h2>
			<p>There are no presentations submitted yet.</p>
		</div>
	{/if}
</div>

	<!-- Fullscreen container for presentations -->
	{#if showPresentationModal}
		<div class="fullscreen-presentation-container" bind:this={fullscreenContainer} on:click={exitFullscreen}>
			<div class="presentation-content" on:click|stopPropagation>
				<div class="presentation-header">
					<h2>Presentation: {currentTeamName}</h2>
					<button class="exit-fullscreen-btn" on:click={exitFullscreen}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<PdfViewer files={selectedPresentationFiles} />
			</div>
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

	.view-btn:hover {
		transform: scale(1.05);
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
		padding: 1rem 2rem;
		background: rgba(0, 0, 0, 0.7);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.presentation-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f0f0f0;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
	}

	.exit-fullscreen-btn {
		background: transparent;
		border: none;
		color: #f0f0f0;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.25rem;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.exit-fullscreen-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.presentations-gallery {
			padding: 1rem;
		}

		.presentations-grid {
			grid-template-columns: 1fr;
		}

		.presentation-header {
			padding: 0.75rem 1rem;
		}

		.presentation-header h2 {
			font-size: 1.25rem;
		}
	}
</style>