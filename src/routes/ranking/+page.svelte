<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import type { Team } from '$lib/interfaces/Team';

	const yourTeamsVariable = [
		{ teamName: 'Team A', rating: 85, notes: 'Strong performance this season' },
		{ teamName: 'Team B', rating: 78, notes: 'Improving steadily' },
		{ teamName: 'Team C', rating: 90, notes: 'Top contender for the championship' },
		{ teamName: 'Team D', rating: 70, notes: 'Needs to work on defense' }
	];
</script>

<Sidebar />
<TeamRanking teams={yourTeamsVariable} />

<style>
</style>
