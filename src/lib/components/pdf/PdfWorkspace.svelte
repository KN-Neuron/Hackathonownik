<script lang="ts">
	import Modal from '../Modal.svelte';
	import PdfUpload from './PdfUpload.svelte';
	import PdfViewer from './PdfViewer.svelte';

	let selectedFiles: File[] = [];
	let multiple = false;
	let disabled = false;
	const uploadUrl = '?/upload';
	let showPresentationModal = false;

	function handleFiles(e: CustomEvent<{ files: File[] }>) {
		selectedFiles = e.detail.files;
		showPresentationModal = true;
	}
	function handleUploaded(e: CustomEvent<{ success: boolean; message?: string }>) {}
</script>

<div id="box">
	<div id="pdf-upload">
		<PdfUpload
			{multiple}
			{disabled}
			{uploadUrl}
			on:files={handleFiles}
			on:uploaded={handleUploaded}
		/>
	</div>
	<div id="pdf-viewer">
		<Modal bind:show={showPresentationModal}>
			<PdfViewer {multiple} files={selectedFiles} />
		</Modal>
	</div>
</div>

<style>
	#box {
		display: flex;
		max-width: 100%;
		height: 100%;
		justify-content: center;
		gap: 50px;
		align-items: center;
		background: #f3f3f3;
	}
	#pdf-upload {
		height: 100%;
	}
	#pdf-viewer {
		max-width: 400px;
		background: #f00;
	}
</style>
