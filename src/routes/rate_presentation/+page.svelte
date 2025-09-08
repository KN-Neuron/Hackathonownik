<script>
	import TeamSection from '$lib/components/TeamSection.svelte';

	export let data;
	let { teams } = data;
</script>

<TeamSection {teams} />
