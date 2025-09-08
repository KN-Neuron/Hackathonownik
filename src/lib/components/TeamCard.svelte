<script lang="ts">
	import { onMount } from 'svelte';

	let { team } = $props();
	let avatarSrc = '';

	// Generate GitHub-style identicon based on team ID
	onMount(() => {
		// Use team ID to generate consistent but unique avatar
		// This creates a deterministic MD5 hash-like string for consistency
		const hash = cyrb53(team.id).toString(16).padStart(8, '0');
		avatarSrc = `https://avatars.dicebear.com/api/identicon/${hash}.svg`;
	});

	// Simple hash function for deterministic avatars
	function cyrb53(str: string, seed = 0) {
		let h1 = 0xdeadbeef ^ seed,
			h2 = 0x41c6ce57 ^ seed;
		for (let i = 0, ch; i < str.length; i++) {
			ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
		h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
		h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
		return 4294967296 * (2097151 & h2) + (h1 >>> 0);
	}

	// Calculate score as percentage for progress bars
	const getScorePercentage = (score) => {
		return score ? Math.min(Math.max(score * 20, 0), 100) : 0; // Assuming scores are on 0-5 scale
	};
</script>

<div class="team-card">
	<div class="avatar-container">
		<img src={avatarSrc} alt="{team.name} avatar" class="team-avatar" />
	</div>

	<div class="team-details">
		<div class="team-header">
			<h2>{team.name}</h2>
			<div class="team-id">ID: {team.id}</div>
		</div>

		<div class="scores-container">
			<div class="score-row">
				<div class="score-label">Innovation</div>
				<div class="progress-bar-container">
					<div class="progress-bar" style="width: {getScorePercentage(team.innowacyjnosc)}%"></div>
				</div>
				<div class="score-value">{team.innowacyjnosc || 'N/A'}</div>
			</div>

			<div class="score-row">
				<div class="score-label">Usefulness</div>
				<div class="progress-bar-container">
					<div class="progress-bar" style="width: {getScorePercentage(team.uzytecznosc)}%"></div>
				</div>
				<div class="score-value">{team.uzytecznosc || 'N/A'}</div>
			</div>

			<div class="score-row">
				<div class="score-label">Presentation</div>
				<div class="progress-bar-container">
					<div
						class="progress-bar"
						style="width: {getScorePercentage(team.prezentacja_koncowa)}%"
					></div>
				</div>
				<div class="score-value">{team.prezentacja_koncowa || 'N/A'}</div>
			</div>

			<div class="score-row">
				<div class="score-label">Implementation</div>
				<div class="progress-bar-container">
					<div
						class="progress-bar"
						style="width: {getScorePercentage(team.jakosc_implementacji)}%"
					></div>
				</div>
				<div class="score-value">{team.jakosc_implementacji || 'N/A'}</div>
			</div>

			<div class="score-row final-grade">
				<div class="score-label">Final Grade</div>
				<div class="progress-bar-container">
					<div class="progress-bar" style="width: {getScorePercentage(team.ocena)}%"></div>
				</div>
				<div class="score-value">{team.ocena || 'N/A'}</div>
			</div>
		</div>

		<div class="grading-status" class:pending={!team.was_graded}>
			{team.was_graded ? 'Graded' : 'Pending'}
		</div>
	</div>
</div>

<style>
	.team-card {
		display: flex;
		background-color: #202225;
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 20px;
		color: #e9ecef;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
		width: 100%;
	}

	.team-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
	}

	.avatar-container {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		margin-right: 20px;
		background-color: #17181a;
		border-radius: 8px;
		height: 120px;
		width: 120px;
	}

	.team-avatar {
		max-width: 100%;
		max-height: 100%;
	}

	.team-details {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.team-header {
		margin-bottom: 16px;
	}

	.team-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #ffffff;
	}

	.team-id {
		font-size: 0.85rem;
		color: #a0a0a0;
		margin-top: 2px;
	}

	.scores-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.score-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.score-label {
		width: 110px;
		font-size: 0.9rem;
		color: #b9bbbe;
	}

	.progress-bar-container {
		flex: 1;
		height: 8px;
		background-color: #2e3136;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #5865f2 0%, #8a94ff 100%);
		border-radius: 4px;
		transition: width 0.5s ease-out;
	}

	.score-value {
		width: 40px;
		text-align: right;
		font-weight: bold;
	}

	.final-grade .score-label {
		font-weight: bold;
		color: #ffffff;
	}

	.final-grade .progress-bar {
		background: linear-gradient(90deg, #eb4034 0%, #ff9f5a 100%);
	}

	.grading-status {
		margin-top: 14px;
		padding: 6px 12px;
		border-radius: 16px;
		font-size: 0.85rem;
		font-weight: bold;
		text-transform: uppercase;
		background-color: #3ba55c;
		color: white;
		align-self: flex-start;
		text-align: center;
	}

	.grading-status.pending {
		background-color: #e74c3c;
	}
</style>
