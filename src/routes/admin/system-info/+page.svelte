<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data } = $props();
	const eventConfig = data.eventConfig;

	let icon = IconNames.Info;
	let text = 'System Information';
</script>

<div class="system-info-container">
	<HeaderText {icon} {text} />

	<div class="info-section mt-8">
		<h2 class="text-2xl font-bold mb-4">Event Details</h2>
		<div class="bg-base-200 rounded-lg p-6 shadow">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<span class="text-base-content/70 block">Event Name</span>
					<span class="text-xl font-semibold">{eventConfig.name}</span>
				</div>
				<div>
					<span class="text-base-content/70 block">Year</span>
					<span class="text-xl font-semibold">{eventConfig.year}</span>
				</div>
				<div>
					<span class="text-base-content/70 block">Organizer</span>
					<span class="text-xl font-semibold">{eventConfig.organizer}</span>
				</div>
				<div>
					<span class="text-base-content/70 block">Deadline</span>
					<span class="text-xl font-semibold">{new Date(eventConfig.deadline).toLocaleString()}</span>
				</div>
			</div>
		</div>
	</div>

	<div class="info-section mt-8">
		<h2 class="text-2xl font-bold mb-4">Categories</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each eventConfig.categories as category}
				<div class="card bg-base-200 shadow">
					<div class="card-body">
						<h3 class="card-title">
							<div class="w-4 h-4 rounded-full" style="background-color: {category.color}"></div>
							{category.name}
						</h3>
						<p class="text-sm text-base-content/60">Key: {category.key}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="info-section mt-8 mb-12">
		<h2 class="text-2xl font-bold mb-4">Rating Criteria</h2>
		<div class="overflow-x-auto bg-base-200 rounded-lg shadow">
			<table class="table table-zebra w-full">
				<thead>
					<tr>
						<th>Name</th>
						<th>Key</th>
						<th>Max Score</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					{#each eventConfig.rating_criteria as criterion}
						<tr>
							<td class="font-bold">{criterion.name}</td>
							<td class="font-mono text-sm">{criterion.key}</td>
							<td>{criterion.maxScore}</td>
							<td class="text-base-content/70">{criterion.description || '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="info-section mt-8 mb-12">
		<h2 class="text-2xl font-bold mb-4">Useful Links</h2>
		<div class="overflow-x-auto bg-base-200 rounded-lg shadow">
			<table class="table table-zebra w-full">
				<thead>
					<tr>
						<th>Title</th>
						<th>Description</th>
						<th>URL</th>
						<th>Button Text</th>
					</tr>
				</thead>
				<tbody>
					{#each eventConfig.links as link}
						<tr>
							<td class="font-bold">{link.title}</td>
							<td class="text-base-content/70">{link.description}</td>
							<td class="font-mono text-sm break-all"><a href={link.url} target="_blank" class="link link-primary">{link.url}</a></td>
							<td>{link.buttonText}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
    
    <div class="flex justify-start mt-4">
        <a href="/admin/dashboard" class="btn btn-outline">Back to Dashboard</a>
    </div>
</div>

<style>
	.system-info-container {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.info-section {
		margin-bottom: 2rem;
	}
</style>
