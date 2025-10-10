<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import { IconNames } from '$lib/utils/utils';

	export let data;

	const { rankings, totalJuries } = data;

	let icon = IconNames.Ranking;
	let text = 'Team Rankings';
</script>

<div class="page-content">
	<HeaderText {icon} {text} />
	<div class="mb-4">
		<p class="text-base-content/70">
			View all team ratings and their completion status. Teams with ratings from all juries are
			marked as final.
		</p>
	</div>
	<TeamRanking {rankings} {totalJuries} />
</div>

<style>
	.page-content {
		padding: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}
</style>
