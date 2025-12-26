<script>
	const { data } = $props();
	console.log(data);
</script>

{#if data}
	<div>
		<p>
			{data.user.name}
		</p>
		<p>
			{data.submission?.category}
		</p>
		<p>
			{data.submission?.created}
		</p>

		<p>
			{data.submission?.repo_link}
		</p>

		<p>
			{data.submission?.video_link}
		</p>
	</div>
{:else}
	<h1>No Submissions yet</h1>
{/if}

<style></style>

