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
		gap: 20px;
		background-color: var(--surface);
		border-radius: var(--radius-card);
		padding: 20px;
		margin-bottom: 12px;
		border: 1px solid var(--line);
		position: relative;
	}

	.order-number {
		margin-right: 0.35rem;
		color: var(--text-muted);
	}

	.submission-status {
		margin: 0.5rem 0 0.75rem;
	}

	.opened {
		margin: 0 0 0.75rem;
		font-size: 13px;
		color: var(--text-muted);
	}

	.opened .yes {
		color: var(--success);
	}

	.jury-notes {
		margin: 0 0 0.75rem;
	}

	.jury-notes summary {
		cursor: pointer;
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: 14px;
		font-weight: 600;
		color: #c9cfdd;
	}

	.notes-status {
		margin-left: 0.5rem;
		font-weight: 600;
		font-size: 12px;
		color: var(--success);
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
		border-radius: var(--radius-control);
	}

	.team-avatar {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-control);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.team-info {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.team-header {
		margin-bottom: 12px;
		border-bottom: 1px solid var(--line);
		padding-bottom: 8px;
	}

	.team-header h3 {
		margin: 0 0 4px 0;
		font-size: 20px;
		color: #fff;
		font-weight: 700;
	}

	.team-id {
		font-size: 12px;
		color: var(--text-faint);
		font-family: ui-monospace, monospace;
	}

	.metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px 24px;
		margin-bottom: 12px;
	}

	.metric {
		display: flex;
		align-items: center;
	}

	.metric-label {
		width: 120px;
		font-size: 14px;
		color: var(--text-muted);
	}

	.metric-bar {
		flex-grow: 1;
		height: 8px;
		background-color: var(--base-300);
		border-radius: 999px;
		overflow: hidden;
		margin: 0 10px;
	}

	.metric-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.3s ease;
	}

	.metric-value {
		min-width: 48px;
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		text-align: right;
		white-space: nowrap;
	}

	.team-footer {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.grade-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.grade {
		font-size: 15px;
	}

	.grade-label {
		color: var(--text-muted);
		margin-right: 6px;
	}

	.grade-value {
		color: #fff;
		font-weight: 700;
	}

	.rating-status {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.rating-badge {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
	}

	.rating-badge.rated {
		background-color: rgba(54, 195, 153, 0.16);
		color: var(--success);
	}

	.rating-badge.not-rated {
		background-color: rgba(247, 166, 84, 0.16);
		color: var(--warning);
	}

	.rating-count {
		font-size: 13px;
		color: var(--text-muted);
	}

	.count {
		font-weight: 700;
		color: #fff;
	}

	.function-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	/* One button set: 44px, ghost for the materials, violet for the rating itself */
	.btn {
		min-height: 44px;
		padding: 0 16px;
		border-radius: var(--radius-control);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: transparent;
		color: var(--text);
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.btn-missing {
		color: var(--text-faint);
		border-style: dashed;
		cursor: default;
	}

	.btn-missing:hover {
		background: transparent;
	}

	.btn-final {
		background: var(--warning);
		border-color: var(--warning);
		color: #1c1200;
	}

	.btn-final:hover {
		background: #f9b878;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.team-card {
			flex-direction: column;
			gap: 12px;
			padding: 16px;
		}

		.team-avatar {
			width: 48px;
			height: 48px;
		}

		.metrics {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.metric-label {
			width: 100px;
		}

		.function-buttons .btn,
		.function-buttons :global(.btn) {
			flex: 1 1 140px;
		}
	}
</style>
