<script lang="ts">
  import PdfUpload from './PdfUpload.svelte';
  import PdfViewer from './PdfViewer.svelte';

  let selectedFiles: File[] = [];
  let multiple = false; // toggle if desired
  let disabled = false;
  const uploadUrl = '?/upload';

  function handleFiles(e: CustomEvent<{ files: File[] }>) {
    selectedFiles = e.detail.files;
  }
  function handleUploaded(e: CustomEvent<{ success: boolean; message?: string }>) {
    // Could display a toast or log:
    // console.log('Upload result:', e.detail);
  }
</script>

<div class="uploader-layout flex flex-col md:flex-row gap-6 items-stretch max-w-[1500px] mx-auto">
  <PdfUpload
    {multiple}
    {disabled}
    {uploadUrl}
    on:files={handleFiles}
    on:uploaded={handleUploaded}
  />
  <PdfViewer {multiple} files={selectedFiles} />
</div>

<style>
  .uploader-layout {
    padding-inline: 1rem;
    padding-block: 1.25rem;
  }
</style>
