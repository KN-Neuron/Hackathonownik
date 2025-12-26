<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import GradeTeamForm from './GradeTeamForm.svelte';
	import PdfViewer from './pdf/PdfViewer.svelte';
	import { Button } from '$lib/components/ui';

	export let team;


	let avatarBg = '';
	let avatarShape = '';
	let showFormModal = false;
	let showPresentationModal = false;
	let loadingPresentation = false;
	let presentationFiles = [];

	// Constants
	const avatarColors = [
		'var(--brand-purple)',
		'var(--brand-blue)',
		'var(--error)',
		'var(--commerce-color)',
		'var(--wellness-color)',
		'var(--info)'
	];

	onMount(() => {
		const hash = hashCode(team.id);
		const colorIndex = Math.abs(hash) % avatarColors.length;
		avatarBg = avatarColors[colorIndex];

		const shapes = ['circle', 'square', 'hexagon', 'diamond'];
		const shapeIndex = Math.abs(hash >> 4) % shapes.length;
		avatarShape = shapes[shapeIndex];
	});

	async function urlToFile(url, filename, mimeType = 'application/pdf') {
		const response = await fetch(url);
		const blob = await response.blob();
		return new File([blob], filename, { type: mimeType });
	}

	function hashCode(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return hash;
	}

	function getAvatarBlocks(id, gridSize = 5) {
		const hash = hashCode(id);
		const blocks = [];
		for (let x = 0; x < gridSize; x++) {
			for (let y = 0; y < gridSize; y++) {
				const bit = ((hash >> (x * gridSize + y)) & 1) === 1;
				if (bit) blocks.push({ x, y });
			}
		}
		return blocks;
	}

	// Calculate width based on max score for each metric
	function getScoreWidth(score, maxScore = 5) {
		if (!score) return '0%';
		const percentage = (score / maxScore) * 100;
		return `${Math.min(percentage, 100)}%`;
	}

	// Color based on percentage of max score
	function getScoreColor(score, maxScore = 5) {
		if (!score) return 'var(--score-poor)';
		const percentage = (score / maxScore) * 100;
		if (percentage >= 90) return 'var(--score-excellent)'; // Green for 90%+
		if (percentage >= 70) return 'var(--score-good)'; // Orange for 70%+
		if (percentage >= 50) return 'var(--score-average)'; // Pink for 50%+
		return 'var(--score-poor)'; // Gray for < 50%
	}

	// Get CSS class based on score for standardized styling
	function getScoreClass(score, maxScore = 5) {
		if (!score) return 'metric-fill-poor';
		const percentage = (score / maxScore) * 100;
		if (percentage >= 90) return 'metric-fill-excellent';
		if (percentage >= 70) return 'metric-fill-good';
		if (percentage >= 50) return 'metric-fill-average';
		return 'metric-fill-poor';
	}

	async function getPresentationFiles(team) {
		if (team.presentationUrl) {
			const filename = team.presentationUrl.split('/').pop() || 'presentation.pdf';
			const file = await urlToFile(team.presentationUrl, filename);
			return [file];
		}
		return [];
	}

	function downloadPresentation() {
		if (team.presentationUrl) {
			// Create a temporary anchor element to trigger the download
			const link = document.createElement('a');
			link.href = team.presentationUrl;
			// Try to get the filename from the URL, fallback to a default name
			const filename = team.presentationUrl.split('/').pop() || `presentation-${team.name}.pdf`;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	async function showPresentationModalHandler() {
		loadingPresentation = true;
		try {
			presentationFiles = await getPresentationFiles(team);
			showPresentationModal = true;
		} catch (err) {
			console.error('Error loading presentation:', err);
		} finally {
			loadingPresentation = false;
		}
	}

	// Calculate final grade from individual scores
	function calculateFinalGrade() {
		const hasAllScores =
			team.innowacyjnosc != null &&
			team.uzytecznosc != null &&
			team.prezentacja_koncowa != null &&
			team.jakosc_implementacji != null;

		if (!hasAllScores) return null;

		return team.innowacyjnosc + team.uzytecznosc + team.prezentacja_koncowa + team.jakosc_implementacji;
	}

	let finalGrade = $derived(calculateFinalGrade());
</script>

<div class="team-card">
	<Modal bind:show={showFormModal}>
		<GradeTeamForm teamId={team.id} />
	</Modal>

	<Modal bind:show={showPresentationModal}>
		{#snippet header()}
			<h2>Team Presentation: {team.name}</h2>
		{/snippet}
		<PdfViewer files={presentationFiles} />
	</Modal>

	<div class="team-avatar" style="background-color: {avatarBg}">
		<svg width="50" height="50" viewBox="0 0 50 50">
			{#each getAvatarBlocks(team.id, 5) as block}
				<rect
					width="8"
					height="8"
					x={block.x * 10}
					y={block.y * 10}
					fill="rgba(255,255,255,0.8)"
					rx="2"
				/>
			{/each}
		</svg>
	</div>

	<div class="team-info">
		<div class="team-header">
			<h3>{team.name}</h3>
			<span class="team-id">ID: {team.id}</span>
		</div>

		<div class="metrics">
			<div class="metric">
				<div class="metric-label">Innovation</div>
				<div class="metric-bar">
					<div
						class="metric-fill {getScoreClass(team.innowacyjnosc, 5)}"
						style="width: {getScoreWidth(team.innowacyjnosc, 5)}"
					></div>
				</div>
				<div class="metric-value">{team.innowacyjnosc != null ? `${team.innowacyjnosc}/5` : '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Usefulness</div>
				<div class="metric-bar">
					<div
						class="metric-fill {getScoreClass(team.uzytecznosc, 5)}"
						style="width: {getScoreWidth(team.uzytecznosc, 5)}"
					></div>
				</div>
				<div class="metric-value">{team.uzytecznosc != null ? `${team.uzytecznosc}/5` : '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Presentation</div>
				<div class="metric-bar">
					<div
						class="metric-fill {getScoreClass(team.prezentacja_koncowa, 5)}"
						style="width: {getScoreWidth(team.prezentacja_koncowa, 5)}"
					></div>
				</div>
				<div class="metric-value">{team.prezentacja_koncowa != null ? `${team.prezentacja_koncowa}/5` : '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Implementation</div>
				<div class="metric-bar">
					<div
						class="metric-fill {getScoreClass(team.jakosc_implementacji, 10)}"
						style="width: {getScoreWidth(team.jakosc_implementacji, 10)}"
					></div>
				</div>
				<div class="metric-value">{team.jakosc_implementacji != null ? `${team.jakosc_implementacji}/10` : '-'}</div>
			</div>
		</div>

		<div class="team-footer">
			<div class="grade-section">
				<div class="grade">
					<span class="grade-label">Final Grade:</span>
					<span class="grade-value">{finalGrade != null ? `${finalGrade}/25` : '-'}</span>
				</div>

				<!-- Rating Status Section -->
				<div class="rating-status">
					<div class="rating-badge {team.isRatedByCurrentJury ? 'rated' : 'not-rated'}">
						{team.isRatedByCurrentJury ? 'You rated' : 'Not rated by you'}
					</div>
					<div class="rating-count">
						<span class="count">{team.ratingsCount || 0}</span>
						<span class="count-label">/ {team.totalJuries} juries</span>
					</div>
				</div>
			</div>

			<div class="function-buttons">
				<a
					href={team.repo_link}
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-repo"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
					</svg>
					Repository
				</a>
				<a
					href={team.video_link}
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-video"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="5 3 19 12 5 21 5 3"></polygon>
					</svg>
					Video Demo
				</a>
				<Button
					variant="secondary"
					on:click={showPresentationModalHandler}
					{...(loadingPresentation ? { loading: true } : {})}
					class="btn-presentation"
				>
					{#if !loadingPresentation}View Presentation{/if}
				</Button>

				<button
					class="btn btn-download"
					on:click={downloadPresentation}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7,10 12,15 17,10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
					Download
				</button>

				<Button
					variant={team.isRatedByCurrentJury ? 'success' : 'primary'}
					on:click={() => (showFormModal = true)}
					class="btn-rate"
				>
					{team.isRatedByCurrentJury ? 'Edit Rating' : 'Rate Team'}
				</Button>
			</div>
		</div>
	</div>
</div>

<style>
	.team-card {
		display: flex;
		background-color: #1e1f22; /* var(--card-bg) */
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* var(--card-shadow) */
		border: 1px solid #2c2e33; /* var(--card-border) */
		position: relative;
	}

	.team-avatar {
		width: 80px;
		height: 80px;
		border-radius: 8px;
		margin-right: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.team-info {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.team-header {
		margin-bottom: 12px;
		border-bottom: 1px solid #2c2e33; /* var(--border-dark) */
		padding-bottom: 8px;
	}

	.team-header h3 {
		margin: 0 0 4px 0;
		font-size: 18px;
		color: #f0f0f0; /* var(--text-primary) */
		font-weight: 600;
	}

	.team-id {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.5); /* var(--text-tertiary) */
		font-family: monospace;
	}

	.metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px 20px;
		margin-bottom: 12px;
	}

	.metric {
		display: flex;
		align-items: center;
	}

	.metric-label {
		width: 100px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.6); /* var(--text-quaternary) */
	}

	.metric-bar {
		flex-grow: 1;
		height: 8px;
		background-color: #252d42; /* var(--base-300) */
		border-radius: 4px;
		overflow: hidden;
		margin: 0 10px;
	}

	.metric-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease;
	}

	.metric-value {
		min-width: 45px;
		font-size: 13px;
		font-weight: 600;
		color: #f0f0f0; /* var(--text-primary) */
		text-align: right;
		white-space: nowrap;
	}

	.team-footer {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid #2c2e33; /* var(--border-dark) */
	}

	.grade-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.grade {
		font-size: 15px;
	}

	.grade-label {
		color: rgba(255, 255, 255, 0.6); /* var(--text-quaternary) */
		margin-right: 6px;
	}

	.grade-value {
		color: #f0f0f0; /* var(--text-primary) */
		font-weight: 600;
	}

	.rating-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.rating-badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.rating-badge.rated {
		background-color: #36c399; /* var(--success) */
		color: #f0f0f0; /* var(--brand-light) */
	}

	.rating-badge.not-rated {
		background-color: #ff6b6b; /* var(--error) */
		color: #f0f0f0; /* var(--brand-light) */
	}

	.rating-count {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6); /* var(--text-quaternary) */
	}

	.count {
		font-weight: 600;
		color: #f0f0f0; /* var(--text-primary) */
	}

	.function-buttons {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}

	.btn {
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	.btn-repo {
		background-color: #6e5494; /* GitHub purple */
		color: white;
	}

	.btn-repo:hover {
		background-color: #5c477e; /* Darker GitHub purple */
	}

	.btn-video {
		background-color: #ff0000; /* YouTube red */
		color: white;
	}

	.btn-video:hover {
		background-color: #cc0000; /* Darker YouTube red */
	}

	.btn-download {
		background-color: #6b7280; /* Gray */
		color: white;
	}

	.btn-download:hover {
		background-color: #565966; /* Darker Gray */
	}

	.btn-primary {
		background-color: var(--btn-primary-bg);
		color: white;
	}

	.btn-primary.already-rated {
		background-color: var(--success);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-left-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.team-card {
			flex-direction: column;
		}

		.team-avatar {
			width: 60px;
			height: 60px;
			margin-right: 12px;
		}

		.metrics {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.metric {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}

		.metric-label {
			width: 100%;
			text-align: left;
		}

		.metric-bar {
			width: 100%;
			margin: 0;
		}

		.metric-value {
			align-self: flex-end;
		}

		.team-footer {
			flex-direction: column;
		}

		.grade-section {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.rating-status {
			align-items: flex-start;
			width: 100%;
		}

		.function-buttons {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}

		.team-id {
			font-size: 11px;
		}
	}
</style>
