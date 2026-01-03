<script>
	import PdfWorkspace from '$lib/components/pdf/PdfWorkspace.svelte';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	let icon = IconNames.Upload;
	let text = 'PDF Upload & Preview';
</script>

<div class="box">
	<HeaderText {icon} {text} />
	<div>
		<PdfWorkspace />
	</div>
</div>

<style>
	div {
		padding: 25px;
	}
	.box {
		max-width: 100%;

		max-height: 100%;
	}
</style>
