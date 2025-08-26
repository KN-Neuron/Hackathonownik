<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import { IconNames } from '$lib/utils/utils';

	const yourTeamsVariable = [
		{ teamName: 'Team A', rating: 85, notes: 'Strong performance this season' },
		{ teamName: 'Team B', rating: 78, notes: 'Improving steadily' },
		{ teamName: 'Team C', rating: 90, notes: 'Top contender for the championship' },
		{ teamName: 'Team D', rating: 70, notes: 'Needs to work on defense' }
	];
	let icon = IconNames.Ranking;
	let text = 'Ranking';
</script>

<div>
	<HeaderText {icon} {text} />
	<TeamRanking teams={yourTeamsVariable} />
</div>

<style>
	div {
		padding: 25px;
	}
</style>
