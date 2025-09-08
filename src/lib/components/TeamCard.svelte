<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import GradeTeamForm from './GradeTeamForm.svelte';

	let { team } = $props();
	let avatarColors = ['#543bad', '#36a3db', '#e85c90', '#f7a654', '#36c399', '#8957e5'];
	let avatarBg = '';
	let avatarShape = '';
	let showModal = $state(false);

	onMount(() => {
		const hash = hashCode(team.id);
		const colorIndex = Math.abs(hash) % avatarColors.length;
		avatarBg = avatarColors[colorIndex];

		const shapes = ['circle', 'square', 'hexagon', 'diamond'];
		const shapeIndex = Math.abs(hash >> 4) % shapes.length;
		avatarShape = shapes[shapeIndex];
	});

	function hashCode(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return hash;
	}

	function getScoreWidth(score: number) {
		return score ? `${score * 10}%` : '0%';
	}

	function getScoreColor(score: number) {
		if (!score) return '#555';
		if (score >= 9) return '#36c399';
		if (score >= 7) return '#f7a654';
		if (score >= 5) return '#e85c90';
		return '#555';
	}
</script>

<div class="team-card" on:click={() => (showModal = true)}>
	<div class="modal-container">
		<Modal bind:showModal>
			<GradeTeamForm />
		</Modal>
	</div>

	<div class="team-avatar" style="background-color: {avatarBg}">
		<div class="avatar-shape {avatarShape}"></div>
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
			<div class="grade">
				<span class="grade-label">Final Grade:</span>
				<span class="grade-value">{team.ocena || '-'}</span>
			</div>

			<div class="status-container">
				<div class="status" class:graded={team.was_graded}></div>
				<span>{team.was_graded ? 'Graded' : 'Pending'} </span>
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
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		cursor: pointer;
		position: relative;
	}
	.modal-container {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.team-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
		border-color: #3b3e46;
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

	.avatar-shape {
		width: 50px;
		height: 50px;
		background-color: rgba(255, 255, 255, 0.15);
	}

	.avatar-shape.circle {
		border-radius: 50%;
	}

	.avatar-shape.hexagon {
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}

	.avatar-shape.square {
		border-radius: 4px;
	}

	.avatar-shape.diamond {
		transform: rotate(45deg);
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
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		text-align: center;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid #2c2e33;
		margin-right: 30px;
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

	.status {
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 13px;
		font-weight: 600;
		background-color: #763626;
		color: #f0f0f0;
		height: 100%;
		margin-right: 10px;
	}
	.status-container {
		display: flex;
		justify-content: center;
	}

	.status.graded {
		background-color: #36623d;
	}
</style>
