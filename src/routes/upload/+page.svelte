<script lang="ts">
	import UploadFile from '$lib/components/UploadFile.svelte';
	import { enhance } from '$app/forms';

	export let form;

	const onDrop = (files) => {
		console.log(`Files selected: ${files.map((d) => d.name).join(', ')}`);
	};
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-6">Upload PDF Presentation</h1>

	<UploadFile {onDrop} />

	{#if form}
		<div
			class="mt-4 p-4 rounded-md {form.success
				? 'bg-green-100 text-green-800'
				: 'bg-red-100 text-red-800'}"
		>
			{form.message}
		</div>
	{/if}
</div>
