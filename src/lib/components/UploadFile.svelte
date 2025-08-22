<script>
	// ************************ Drag and drop ***************** //
	let dropArea = document.getElementById('drop-area');

	// Prevent default drag behaviors
	['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
		dropArea.addEventListener(eventName, preventDefaults, false);
		document.body.addEventListener(eventName, preventDefaults, false);
	});

	// Highlight drop area when item is dragged over it
	['dragenter', 'dragover'].forEach((eventName) => {
		dropArea.addEventListener(eventName, highlight, false);
	});
	['dragleave', 'drop'].forEach((eventName) => {
		dropArea.addEventListener(eventName, unhighlight, false);
	});

	// Handle dropped files
	dropArea.addEventListener('drop', handleDrop, false);

	function preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	function highlight(e) {
		dropArea.classList.add('highlight');
	}

	function unhighlight(e) {
		dropArea.classList.remove('active');
	}

	function handleDrop(e) {
		var dt = e.dataTransfer;
		var files = dt.files;

		handleFiles(files);
	}

	let uploadProgress = [];
	let progressBar = document.getElementById('progress-bar');

	function initializeProgress(numFiles) {
		progressBar.value = 0;
		uploadProgress = [];

		for (let i = numFiles; i > 0; i--) {
			uploadProgress.push(0);
		}
	}

	function updateProgress(fileNumber, percent) {
		uploadProgress[fileNumber] = percent;
		let total = uploadProgress.reduce((tot, curr) => tot + curr, 0) / uploadProgress.length;
		progressBar.value = total;
	}

	function handleFiles(files) {
		files = [...files];
		initializeProgress(files.length);
		files.forEach(uploadFile);
		files.forEach(previewFile);
	}

	function previewFile(file) {
		let reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onloadend = function () {
			let img = document.createElement('img');
			img.src = reader.result;
			document.getElementById('gallery').appendChild(img);
		};
	}

	function uploadFile(file, i) {
		var url = 'https://api.cloudinary.com/v1_1/joezimim007/image/upload';
		var xhr = new XMLHttpRequest();
		var formData = new FormData();
		xhr.open('POST', url, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

		// Update progress (can be used to show progress indicator)
		xhr.upload.addEventListener('progress', function (e) {
			updateProgress(i, (e.loaded * 100.0) / e.total || 100);
		});

		xhr.addEventListener('readystatechange', function (e) {
			if (xhr.readyState == 4 && xhr.status == 200) {
				updateProgress(i, 100); // <- Add this
			} else if (xhr.readyState == 4 && xhr.status != 200) {
				// Error. Inform the user
			}
		});

		formData.append('upload_preset', 'ujpu6gyk');
		formData.append('file', file);
		xhr.send(formData);
	}
</script>

<div class="drop-zone">
	<span class="drop-zone__prompt">Drop file here or click to upload</span>
	<input type="file" name="myFile" class="drop-zone__input" />
</div>

<style>
	.drop-zone {
		max-width: 200px;
		height: 200px;
		padding: 25px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-family: 'Quicksand', sans-serif;
		font-weight: 500;
		font-size: 20px;
		cursor: pointer;
		color: #cccccc;
		border: 4px dashed #009578;
		border-radius: 10px;
	}

	.drop-zone--over {
		border-style: solid;
	}

	.drop-zone__input {
		display: none;
	}

	.drop-zone__thumb {
		width: 100%;
		height: 100%;
		border-radius: 10px;
		overflow: hidden;
		background-color: #cccccc;
		background-size: cover;
		position: relative;
	}

	.drop-zone__thumb::after {
		content: attr(data-label);
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		padding: 5px 0;
		color: #ffffff;
		background: rgba(0, 0, 0, 0.75);
		font-size: 14px;
		text-align: center;
	}
</style>
