<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import GradeTeamForm from './GradeTeamForm.svelte';
	import PdfViewer from './pdf/PdfViewer.svelte';
	import SubmissionChecklist from './SubmissionChecklist.svelte';
	import { toEmbedUrl } from '$lib/utils/videoEmbed';
	import { reportView } from '$lib/utils/reportView';
	import type { EventCategory, RatingCriterion } from '$lib/types';
	import { Button } from '$lib/components/ui';
	import { page } from '$app/stores';

	let { team, locked = false } = $props();
	const eventConfig = $page.data.eventConfig;

	let avatarBg = $state('');
	let avatarShape = $state('');
	let showFormModal = $state(false);
	let showPresentationModal = $state(false);
	let loadingPresentation = $state(false);
	let presentationFiles = $state<File[]>([]);
	let showVideoModal = $state(false);
	let videoEmbedUrl = $derived(team.video_link ? toEmbedUrl(team.video_link) : null);

	// Private notes: autosaved shortly after the jury member stops typing
	let notes = $state(team.notes ?? '');
	let notesStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let notesTimer: ReturnType<typeof setTimeout> | undefined;

	function onNotesInput() {
		notesStatus = 'idle';
		clearTimeout(notesTimer);
		notesTimer = setTimeout(saveNotes, 800);
	}

	function flushNotes() {
		if (notesTimer) saveNotes();
	}

	async function saveNotes() {
		clearTimeout(notesTimer);
		notesTimer = undefined;
		notesStatus = 'saving';
		try {
			const response = await fetch('/api/jury/notes', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ teamId: team.id, content: notes })
			});
			notesStatus = response.ok ? 'saved' : 'error';
		} catch {
			notesStatus = 'error';
		}
	}

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

	async function getPresentationFiles(url: string | null) {
		if (url) {
			const file = await urlToFile(url, `${team.name}.pdf`);
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

	async function showPresentationModalHandler(url: string | null = team.presentationUrl) {
		loadingPresentation = true;
		try {
			presentationFiles = await getPresentationFiles(url);
			// The server records the view when it serves the file
			if (url === team.finalPresentationUrl) viewed.final_presentation = true;
			else viewed.presentation = true;
			showPresentationModal = true;
		} catch (err) {
			console.error('Error loading presentation:', err);
		} finally {
			loadingPresentation = false;
		}
	}

	// What this juror opened; the organizers see it too (rules: jury must review the material)
	let viewed = $state<Record<string, boolean>>({ ...(team.viewed ?? {}) });
	function videoOpened() {
		viewed.video = true;
		reportView(team.id, 'video');
	}
	function repoOpened() {
		viewed.repo = true;
		reportView(team.id, 'repo');
	}

	// Criteria and required items come from the team's category
	const category = $derived(
		(eventConfig.categories as EventCategory[]).find((c) => c.key === team.category)
	);
	// Preliminary round: the preliminary criteria; final: every criterion (rules §8)
	const criteria = $derived(
		((category?.rating_criteria ?? eventConfig.rating_criteria) as RatingCriterion[]).filter(
			(c) => team.stage === 'final' || c.stage !== 'final'
		)
	);
	const maxTotalScore = $derived(
		criteria.reduce((acc: number, c: RatingCriterion) => acc + c.maxScore, 0)
	);
	// This juror's scores (null until rated)
	const score = (key: string): number | null => team.scores?.[key] ?? null;
	let finalGrade = $derived(team.scores ? team.finalGradeDisplay : null);
</script>

<div class="team-card">
	<Modal bind:show={showFormModal}>
		<!-- Mounted only while open: it loads the saved rating when the juror opens it -->
		{#if showFormModal}
			<GradeTeamForm
				teamId={team.id}
				teamName={team.name}
				{criteria}
				onsaved={() => (showFormModal = false)}
				bind:notes
				{notesStatus}
				onnotesinput={onNotesInput}
				onnotesblur={flushNotes}
			/>
		{/if}
	</Modal>

	<Modal bind:show={showVideoModal} wide={true}>
		{#snippet header()}
			<h2>Video Demo: {team.name}</h2>
		{/snippet}
		{#if showVideoModal && videoEmbedUrl}
			<div class="video-frame">
				<iframe
					src={videoEmbedUrl}
					title="Video demo of {team.name}"
					allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
					allowfullscreen
				></iframe>
			</div>
			<a href={team.video_link} target="_blank" rel="noopener noreferrer" class="link text-sm">
				Open in a new tab
			</a>
		{/if}
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
			<h3>
				{#if team.order}<span class="order-number">#{team.order}</span>{/if}
				{team.name}
			</h3>
			<span class="team-id">ID: {team.id}</span>
		</div>

		<div class="submission-status">
			<SubmissionChecklist
				submission={team.submission}
				required={category?.submission.required ?? eventConfig.submission.required}
				mode="jury"
			/>
		</div>

		<p class="opened">
			You opened:
			<span class:yes={viewed.presentation}>PDF {viewed.presentation ? '✓' : '–'}</span>
			· <span class:yes={viewed.video}>video {viewed.video ? '✓' : '–'}</span>
			· <span class:yes={viewed.repo}>repo {viewed.repo ? '✓' : '–'}</span>
			{#if team.stage === 'final'}
				· <span class:yes={viewed.final_presentation}
					>final PDF {viewed.final_presentation ? '✓' : '–'}</span
				>
			{/if}
		</p>

		<details class="jury-notes" open={Boolean(notes)}>
			<summary>
				My private notes
				<span class="notes-status">
					{#if notesStatus === 'saving'}Saving…{:else if notesStatus === 'saved'}Saved{:else if notesStatus === 'error'}Not
						saved – check your connection{/if}
				</span>
			</summary>
			<textarea
				class="textarea textarea-bordered w-full"
				rows="4"
				placeholder="Only you can see these notes. Use them during the presentation."
				bind:value={notes}
				oninput={onNotesInput}
				onblur={flushNotes}
			></textarea>
		</details>

		<div class="metrics">
			{#each criteria as criterion (criterion.key)}
				<div class="metric">
					<div class="metric-label">{criterion.name}</div>
					<div class="metric-bar">
						<div
							class="metric-fill {getScoreClass(score(criterion.key), criterion.maxScore)}"
							style="width: {getScoreWidth(score(criterion.key), criterion.maxScore)}"
						></div>
					</div>
					<div class="metric-value">
						{score(criterion.key) != null ? `${score(criterion.key)}/${criterion.maxScore}` : '-'}
					</div>
				</div>
			{/each}
		</div>

		<div class="team-footer">
			<div class="grade-section">
				<div class="grade">
					<span class="grade-label">Final Grade:</span>
					<span class="grade-value"
						>{finalGrade != null ? `${finalGrade}/${maxTotalScore}` : '-'}</span
					>
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
				{#if team.repo_link}
					<a
						href={team.repo_link}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-repo"
						onclick={repoOpened}
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
				{:else}
					<span class="btn btn-missing">No repository</span>
				{/if}
				{#if videoEmbedUrl}
					<button
						class="btn btn-video"
						onclick={() => {
							showVideoModal = true;
							videoOpened();
						}}
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
						Watch Video
					</button>
				{:else if team.video_link}
					<a
						href={team.video_link}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-video"
						onclick={videoOpened}
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
				{:else}
					<span class="btn btn-missing">No video</span>
				{/if}
				{#if team.presentationUrl}
					<Button
						variant="secondary"
						onclick={() => showPresentationModalHandler(team.presentationUrl)}
						{...loadingPresentation ? { loading: true } : {}}
						class="btn-presentation"
					>
						{#if !loadingPresentation}View Presentation{/if}
					</Button>

					<button class="btn btn-download" onclick={downloadPresentation}>
						<svg
							width="16"
							height="16"
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
				{:else}
					<span class="btn btn-missing">No PDF</span>
				{/if}
				{#if team.stage === 'final'}
					{#if team.finalPresentationUrl}
						<button
							class="btn btn-final"
							onclick={() => showPresentationModalHandler(team.finalPresentationUrl)}
							>Final presentation</button
						>
					{:else}
						<span class="btn btn-missing">No final PDF</span>
					{/if}
				{/if}

				{#if locked}
					<span class="btn btn-missing">Ratings locked</span>
				{:else}
					<Button
						variant={team.isRatedByCurrentJury ? 'success' : 'primary'}
						onclick={() => (showFormModal = true)}
						class="btn-rate"
					>
						{team.isRatedByCurrentJury ? 'Edit Rating' : 'Rate Team'}
					</Button>
				{/if}
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

	.order-number {
		margin-right: 0.35rem;
		color: rgba(255, 255, 255, 0.5);
		font-variant-numeric: tabular-nums;
	}

	.submission-status {
		margin: 0.5rem 0 0.75rem;
	}

	.opened {
		margin: -0.25rem 0 0.5rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.opened .yes {
		color: #36c399;
	}

	.btn-final {
		background: #f7a654;
		color: #1a1206;
	}

	.jury-notes {
		margin: 0 0 0.75rem;
	}

	.jury-notes summary {
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.4rem;
	}

	.notes-status {
		margin-left: 0.5rem;
		font-weight: 400;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.video-frame {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		margin-bottom: 0.5rem;
	}

	.video-frame iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: 0.5rem;
	}

	.btn-missing {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
		cursor: default;
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
