<script>
	import { onMount } from 'svelte';

	let { data } = $props();

	let teamMembers = $state([
		{
			id: 1,
			name: 'Alex Johnson',
			role: 'Team Lead',
			challenge: 'Wellness',
			links: { linkedin: '#', github: '#' }
		},
		{
			id: 2,
			name: 'Maria Garcia',
			role: 'Developer',
			challenge: 'Commerce',
			links: { linkedin: '#', github: '#' }
		},
		{
			id: 3,
			name: 'David Kim',
			role: 'Designer',
			challenge: 'Wellness',
			links: { linkedin: '#', github: '#' }
		},
		{
			id: 4,
			name: 'Sarah Williams',
			role: 'Marketing',
			challenge: 'Commerce',
			links: { linkedin: '#', github: '#' }
		}
	]);

	// Placeholder for additional resources
	let resources = $state([
		{ title: 'Project Guidelines', url: '#', category: 'Documentation' },
		{ title: 'Submission Requirements', url: '#', category: 'Documentation' },
		{ title: 'Team Collaboration Tools', url: '#', category: 'Tools' },
		{ title: 'Event Calendar', url: '#', category: 'Schedule' }
	]);

	onMount(() => {
		// Any initialization code can go here
	});
</script>

<div class="info-page">
	<div class="container mx-auto px-4 py-8">
		<h1 class="text-3xl font-bold mb-8 text-center text-white">General Information</h1>

		<!-- Event Schedule Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-6 text-white border-b pb-2 border-gray-600">Schedule</h2>
			<div class="bg-gray-800 rounded-lg p-6">
				{#each data.eventConfig.schedule as day}
					<h3 class="text-xl font-bold mb-4 text-white">{day.day}</h3>
					<ul class="list-disc pl-6 text-gray-300 space-y-2 mb-6">
						{#each day.events as event}
							<li><span class="font-medium">{event.time}</span> - {event.description}</li>
						{/each}
					</ul>
				{/each}
			</div>
		</section>

		<!-- Resources Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-6 text-white border-b pb-2 border-gray-600">
				Useful Links
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each data.eventConfig.links as link}
					<div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
						<h3 class="text-lg font-medium text-white mb-1">{link.title}</h3>
						<p class="text-sm text-gray-400 mb-2">{link.description}</p>
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
						>
							{link.buttonText}
						</a>
					</div>
				{/each}
			</div>
		</section>

		<!-- Contact Information Section -->
		<section>
			<h2 class="text-2xl font-semibold mb-6 text-white border-b pb-2 border-gray-600">Contact</h2>
			<div class="bg-gray-800 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-3 text-white">Contact Information</h3>
				<p class="text-gray-300 mb-4">
					In case of problems or questions, contact the organizers using links above.
				</p>
			</div>
		</section>
	</div>
</div>

<style>
	.info-page {
		background-color: black;
	}

	.container {
		max-width: 1200px;
	}
</style>

