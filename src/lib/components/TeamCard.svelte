<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import GradeTeamForm from './GradeTeamForm.svelte';
	import PdfViewer from './pdf/PdfViewer.svelte';

	export let team;

	
	let avatarBg = '';
	let avatarShape = '';
	let showFormModal = false;
	let showPresentationModal = false;
	let loadingPresentation = false;
	let presentationFiles = [];

	// Constants
	const avatarColors = ['#543bad', '#36a3db', '#e85c90', '#f7a654', '#36c399', '#8957e5'];

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

	function getScoreWidth(score) {
		return score ? `${score * 10}%` : '0%';
	}

	function getScoreColor(score) {
		if (!score) return '#555';
		if (score >= 9) return '#36c399';
		if (score >= 7) return '#f7a654';
		if (score >= 5) return '#e85c90';
		return '#555';
	}

	async function getPresentationFiles(team) {
		if (team.presentationUrl) {
			const filename = team.presentationUrl.split('/').pop() || 'presentation.pdf';
			const file = await urlToFile(team.presentationUrl, filename);
			return [file];
		}
		return [];
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
						class="metric-fill"
						style="width: {getScoreWidth(team.innowacyjnosc)}; background-color: {getScoreColor(
							team.innowacyjnosc
						)}"
					></div>
				</div>
				<div class="metric-value">{team.innowacyjnosc || '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Usefulness</div>
				<div class="metric-bar">
					<div
						class="metric-fill"
						style="width: {getScoreWidth(team.uzytecznosc)}; background-color: {getScoreColor(
							team.uzytecznosc
						)}"
					></div>
				</div>
				<div class="metric-value">{team.uzytecznosc || '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Presentation</div>
				<div class="metric-bar">
					<div
						class="metric-fill"
						style="width: {getScoreWidth(
							team.prezentacja_koncowa
						)}; background-color: {getScoreColor(team.prezentacja_koncowa)}"
					></div>
				</div>
				<div class="metric-value">{team.prezentacja_koncowa || '-'}</div>
			</div>

			<div class="metric">
				<div class="metric-label">Implementation</div>
				<div class="metric-bar">
					<div
						class="metric-fill"
						style="width: {getScoreWidth(
							team.jakosc_implementacji
						)}; background-color: {getScoreColor(team.jakosc_implementacji)}"
					></div>
				</div>
				<div class="metric-value">{team.jakosc_implementacji || '-'}</div>
			</div>
		</div>

		<div class="team-footer">
			<div class="grade-section">
				<div class="grade">
					<span class="grade-label">Final Grade:</span>
					<span class="grade-value">{team.ocena || '-'}</span>
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
				<button
					class="btn btn-secondary"
					on:click={showPresentationModalHandler}
					disabled={loadingPresentation}
				>
					{#if loadingPresentation}
						<span class="loading loading-spinner loading-xs mr-2"></span>
						Loading...
					{:else}
						View Presentation
					{/if}
				</button>

				<button
					class="btn btn-primary"
					on:click={() => (showFormModal = true)}
					class:already-rated={team.isRatedByCurrentJury}
				>
					{team.isRatedByCurrentJury ? 'Edit Rating' : 'Rate Team'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.team-card {
		display: flex;
		background-color: #1e1f22;
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
		border: 1px solid #2c2e33;
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
		border-bottom: 1px solid #2c2e33;
		padding-bottom: 8px;
	}

	.team-header h3 {
		margin: 0 0 4px 0;
		font-size: 18px;
		color: #f0f0f0;
		font-weight: 600;
	}

	.team-id {
		font-size: 12px;
		color: #888;
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
		color: #aaa;
	}

	.metric-bar {
		flex-grow: 1;
		height: 8px;
		background-color: #2c2e33;
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
		width: 20px;
		font-size: 14px;
		font-weight: 600;
		color: #f0f0f0;
		text-align: right;
	}

	.team-footer {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid #2c2e33;
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
		color: #aaa;
		margin-right: 6px;
	}

	.grade-value {
		color: #f0f0f0;
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
		background-color: #36623d;
		color: #a3f0b5;
	}

	.rating-badge.not-rated {
		background-color: #763626;
		color: #ffcbc0;
	}

	.rating-count {
		font-size: 12px;
		color: #aaa;
	}

	.count {
		font-weight: 600;
		color: #f0f0f0;
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
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	.btn-secondary {
		background-color: #2c2e33;
		color: #f0f0f0;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary.already-rated {
		background-color: #36623d;
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
</style>
