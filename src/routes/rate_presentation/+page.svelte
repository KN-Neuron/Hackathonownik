<script>
	import TeamSection from '$lib/components/TeamSection.svelte';

	export let data;
	let { teams } = data;
</script>

<!-- <pre>{JSON.stringify(data, null, 2)}</pre> -->
<TeamSection {teams} />
