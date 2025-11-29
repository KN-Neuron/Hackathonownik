<script>
	import { onMount } from 'svelte';

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
				<h3 class="text-xl font-bold mb-4 text-white">Saturday, November 29</h3>
				<ul class="list-disc pl-6 text-gray-300 space-y-2 mb-6">
					<li><span class="font-medium">09:00 - 11:00</span> - Participant Registration</li>
					<li><span class="font-medium">11:30 - 12:00</span> - Opening Lecture</li>
					<li><span class="font-medium">12:00</span> - Code Work Begins</li>
					<li><span class="font-medium">17:00</span> - Catering</li>
				</ul>

				<h3 class="text-xl font-bold mb-4 text-white">Sunday, November 30</h3>
				<ul class="list-disc pl-6 text-gray-300 space-y-2">
					<li><span class="font-medium">until 12:00</span> - Code Work Ends</li>
					<li><span class="font-medium">12:00 - 12:30</span> - Lecture</li>
					<li><span class="font-medium">12:30 - 14:00</span> - Project Presentations - Part I</li>
					<li><span class="font-medium">14:00 - 14:30</span> - Coffee Break</li>
					<li><span class="font-medium">14:30 - 16:00</span> - Project Presentations - Part II</li>
					<li><span class="font-medium">16:00 - 16:30</span> - Jury Evaluation</li>
					<li>
						<span class="font-medium">16:30 - 17:00</span> - Award Ceremony and Event Conclusion
					</li>
				</ul>
			</div>
		</section>

		<!-- Resources Section -->
		<section class="mb-12">
			<h2 class="text-2xl font-semibold mb-6 text-white border-b pb-2 border-gray-600">
				Useful Links
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
					<h3 class="text-lg font-medium text-white mb-1">Discord</h3>
					<p class="text-sm text-gray-400 mb-2">Join our Discord server</p>
					<a
						href="https://discord.gg/7vwC65hf"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
					>
						Join Discord →
					</a>
				</div>

				<div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
					<h3 class="text-lg font-medium text-white mb-1">Starter Pack</h3>
					<p class="text-sm text-gray-400 mb-2">Repository with sample code</p>
					<a
						href="https://github.com/KN-Neuron/heroes-of-the-brain-starter-pack"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
					>
						Open Repository →
					</a>
				</div>

				<div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
					<h3 class="text-lg font-medium text-white mb-1">WiFi Instructions</h3>
					<p class="text-sm text-gray-400 mb-2">How to connect to the university WiFi</p>
					<a
						href="https://di.pwr.edu.pl/uslugi/siec/pwrguest"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
					>
						Connection Guide →
					</a>
				</div>
			</div>
		</section>

		<!-- Contact Information Section -->
		<section>
			<h2 class="text-2xl font-semibold mb-6 text-white border-b pb-2 border-gray-600">Contact</h2>
			<div class="bg-gray-800 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-3 text-white">Contact Information</h3>
				<p class="text-gray-300 mb-4">
					In case of problems or questions, contact the organizers on discord.
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

