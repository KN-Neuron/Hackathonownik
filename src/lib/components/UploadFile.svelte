<script lang="ts">
	import { onMount } from 'svelte';

	let fileUpload: HTMLInputElement;
	let fileDrag: HTMLLabelElement;
	let fileImage: HTMLImageElement;
	let fileProgress: HTMLProgressElement;

	let showStart = true;
	let showResponse = false;
	let showNotImage = false;
	let showFileImage = false;
	let isHover = false;
	let messages = '';
	let progressValue = 0;
	let progressMax = 1;

	onMount(() => {
		// Initialize event listeners
		fileUpload.addEventListener('change', fileSelectHandler as EventListener);
		if (window.File && window.FileList && window.FileReader) {
			fileDrag.addEventListener('dragover', fileDragHover);
			fileDrag.addEventListener('dragleave', fileDragHover);
			fileDrag.addEventListener('drop', fileSelectHandler as EventListener);
		} else {
			fileDrag.style.display = 'none';
		}
	});

	function fileDragHover(e: DragEvent) {
		e.stopPropagation();
		e.preventDefault();
		isHover = e.type === 'dragover';
	}

	function fileSelectHandler(e: Event | DragEvent) {
		const files = (e.target as HTMLInputElement)?.files || (e as DragEvent).dataTransfer?.files;
		if (!files) return;

		// Reset hover
		isHover = false;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			parseFile(file);
			uploadFile(file);
		}
	}

	function output(msg: string) {
		messages = msg;
	}

	function parseFile(file: File) {
		output(`<strong>${encodeURI(file.name)}</strong>`);

		const imageName = file.name;
		const isGood = /\.(gif|jpg|png|jpeg)$/i.test(imageName);

		if (isGood) {
			showStart = false;
			showResponse = true;
			showNotImage = false;
			showFileImage = true;
			fileImage.src = URL.createObjectURL(file);
		} else {
			showFileImage = false;
			showNotImage = true;
			showStart = true;
			showResponse = false;
			fileUpload.value = ''; // Reset form
		}
	}

	function setProgressMaxValue(e: ProgressEvent) {
		if (e.lengthComputable) {
			progressMax = e.total;
		}
	}

	function updateFileProgress(e: ProgressEvent) {
		if (e.lengthComputable) {
			progressValue = e.loaded;
		}
	}

	function uploadFile(file: File) {
		const xhr = new XMLHttpRequest();
		const fileSizeLimit = 1024; // In MB

		if (xhr.upload && file.size <= fileSizeLimit * 1024 * 1024) {
			fileProgress.style.display = 'inline';
			xhr.upload.addEventListener('loadstart', setProgressMaxValue);
			xhr.upload.addEventListener('progress', updateFileProgress);

			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					// Handle success/failure as needed (original code just comments this)
				}
			};

			xhr.open('POST', ''); // Set to your SvelteKit action or API route
			xhr.setRequestHeader('X-File-Name', file.name);
			xhr.setRequestHeader('X-File-Size', file.size.toString());
			xhr.setRequestHeader('Content-Type', 'multipart/form-data');
			xhr.send(file);
		} else {
			output(`Please upload a smaller file (< ${fileSizeLimit} MB).`);
		}
	}
</script>

<h2>File Upload & Image Preview</h2>
<p class="lead">No Plugins <b>Just Javascript</b></p>

<form id="file-upload-form" class="uploader">
	<input bind:this={fileUpload} id="file-upload" type="file" name="fileUpload" accept="image/*" />

	<label bind:this={fileDrag} for="file-upload" id="file-drag" class:hover={isHover}>
		<img
			bind:this={fileImage}
			id="file-image"
			src="#"
			alt="Preview"
			class:hidden={!showFileImage}
		/>

		{#if showStart}
			<div id="start">
				<i class="fa fa-download" aria-hidden="true"></i>
				<div>Select a file or drag here</div>
				{#if showNotImage}
					<div id="notimage">Please select an image</div>
				{/if}
				<span id="file-upload-btn" class="btn btn-primary">Select a file</span>
			</div>
		{/if}

		{#if showResponse}
			<div id="response">
				<div id="messages">{@html messages}</div>
				<progress
					bind:this={fileProgress}
					class="progress"
					id="file-progress"
					value={progressValue}
					max={progressMax}
				>
					<span>0</span>%
				</progress>
			</div>
		{/if}
	</label>
</form>

<style>
	@import url(https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css);
	@import url('https://fonts.googleapis.com/css?family=Roboto');

	h2 {
		font-family: 'Roboto', sans-serif;
		font-size: 26px;
		line-height: 1;
		color: #454cad;
		margin-bottom: 0;
	}
	p {
		font-family: 'Roboto', sans-serif;
		font-size: 18px;
		color: #5f6982;
	}

	.uploader {
		display: block;
		clear: both;
		margin: 0 auto;
		width: 100%;
		max-width: 600px;
	}
	.uploader label {
		float: left;
		clear: both;
		width: 100%;
		padding: 2rem 1.5rem;
		text-align: center;
		background: #fff;
		border-radius: 7px;
		border: 3px solid #eee;
		transition: all 0.2s ease;
		user-select: none;
	}
	.uploader label:hover {
		border-color: #454cad;
	}
	.uploader label.hover {
		border: 3px solid #454cad;
		box-shadow: inset 0 0 0 6px #eee;
	}
	.uploader label.hover #start i.fa {
		transform: scale(0.8);
		opacity: 0.3;
	}
	.uploader #start {
		float: left;
		clear: both;
		width: 100%;
	}
	.uploader #start.hidden {
		display: none;
	}
	.uploader #start i.fa {
		font-size: 50px;
		margin-bottom: 1rem;
		transition: all 0.2s ease-in-out;
	}
	.uploader #response {
		float: left;
		clear: both;
		width: 100%;
	}
	.uploader #response.hidden {
		display: none;
	}
	.uploader #response #messages {
		margin-bottom: 0.5rem;
	}
	.uploader #file-image {
		display: inline;
		margin: 0 auto 0.5rem auto;
		width: auto;
		height: auto;
		max-width: 180px;
	}
	.uploader #file-image.hidden {
		display: none;
	}
	.uploader #notimage {
		display: block;
		float: left;
		clear: both;
		width: 100%;
	}
	.uploader #notimage.hidden {
		display: none;
	}
	.uploader progress,
	.uploader .progress {
		display: inline;
		clear: both;
		margin: 0 auto;
		width: 100%;
		max-width: 180px;
		height: 8px;
		border: 0;
		border-radius: 4px;
		background-color: #eee;
		overflow: hidden;
	}
	.uploader .progress[value]::-webkit-progress-bar {
		border-radius: 4px;
		background-color: #eee;
	}
	.uploader .progress[value]::-webkit-progress-value {
		background: linear-gradient(to right, #3f3e9e 0%, #454cad 50%);
		border-radius: 4px;
	}
	.uploader .progress[value]::-moz-progress-bar {
		background: linear-gradient(to right, #3f3e9e 0%, #454cad 50%);
		border-radius: 4px;
	}
	.uploader input[type='file'] {
		display: none;
	}
	.uploader div {
		margin: 0 0 0.5rem 0;
		color: #5f6982;
	}
	.uploader .btn {
		display: inline-block;
		margin: 0.5rem 0.5rem 1rem 0.5rem;
		clear: both;
		font-family: inherit;
		font-weight: 700;
		font-size: 14px;
		text-decoration: none;
		text-transform: initial;
		border: none;
		border-radius: 0.2rem;
		outline: none;
		padding: 0 1rem;
		height: 36px;
		line-height: 36px;
		color: #fff;
		transition: all 0.2s ease-in-out;
		box-sizing: border-box;
		background: #454cad;
		border-color: #454cad;
		cursor: pointer;
	}
</style>
