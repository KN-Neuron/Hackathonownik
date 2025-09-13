<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import { IconNames } from '$lib/utils/utils';

	export let data;

	const { ratings } = data;

	let icon = IconNames.Ranking;
	let text = 'Ranking';
</script>

<div>
	<HeaderText {icon} {text} />
	<TeamRanking {ratings} />
</div>

<style>
	div {
		padding: 25px;
	}
</style>
