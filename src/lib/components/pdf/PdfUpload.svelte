<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import FallbackSvg from '../DropFileFallbackSvg.svelte'; // adjust path if needed
  import { parse as devalueParse } from 'devalue';

  export let multiple: boolean = false;
  export let disabled: boolean = false;
  export let uploadUrl: string = '?/upload'; // SvelteKit action endpoint

  const dispatch = createEventDispatcher<{
    files: { files: File[] };
    uploaded: { success: boolean; message?: string };
  }>();

  let isOver = false;
  let input: HTMLInputElement | null = null;
  let selectedFiles: File[] = [];

  let uploading = false;
  let errorMessage = '';
  let successMessage = '';

  /* ---------- Drag & Drop / File Selection ---------- */

  function handleEnter() { isOver = true; }
  function handleLeave() { isOver = false; }
  function handleDragOver(e: Event) { e.preventDefault(); }

  function filterPdf(list: FileList | File[]): File[] {
    return Array.from(list).filter(f => f.type === 'application/pdf');
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (!e?.dataTransfer?.files || disabled) return;
    selectedFiles = filterPdf(e.dataTransfer.files);
    dispatch('files', { files: selectedFiles });
    isOver = false;
  }

  function handleChange(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    selectedFiles = filterPdf(files);
    dispatch('files', { files: selectedFiles });
  }

  function triggerPick() {
    if (!disabled) input?.click();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') triggerPick();
  }

  /* ---------- Response Parsing Helpers ---------- */

  function isWrapperShape(v: any): v is { type: string; status: number; data: unknown } {
    return v && typeof v === 'object' && 'type' in v && 'status' in v && 'data' in v;
  }

  function looksLikeDevalueArray(arr: any): boolean {
    return Array.isArray(arr) &&
      arr.length >= 3 &&
      typeof arr[0] === 'object' &&
      arr[0] !== null &&
      Object.prototype.hasOwnProperty.call(arr[0], 'success') &&
      Object.prototype.hasOwnProperty.call(arr[0], 'message');
  }

  function attemptDevalueParse(raw: string): any {
    try {
      return devalueParse(raw);
    } catch {
      return null;
    }
  }

  function extractResult(payload: any): { success: boolean; message?: string } {
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return {
        success: Boolean(payload.success),
        message: typeof payload.message === 'string' ? payload.message : ''
      };
    }
    return { success: false, message: '' };
  }

  /* ---------- Upload Logic ---------- */

  async function handleSubmit() {
    if (uploading || disabled || selectedFiles.length === 0) return;

    uploading = true;
    errorMessage = '';
    successMessage = '';

    try {
      const formData = new FormData();
      if (multiple) {
        selectedFiles.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', selectedFiles[0]);
      }

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let topLevel: any = null;

      if (contentType.includes('application/json')) {
        topLevel = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => '');
        try { topLevel = JSON.parse(text); }
        catch { topLevel = text; }
      }

      let effective: any = topLevel;

      if (isWrapperShape(topLevel)) {
        if (typeof topLevel.data === 'string') {
          let innerParsed: any = null;
          try { innerParsed = JSON.parse(topLevel.data); } catch {/* ignore */}
          if (innerParsed && looksLikeDevalueArray(innerParsed)) {
            const reconstructed = attemptDevalueParse(topLevel.data);
            if (reconstructed) {
              effective = reconstructed;
            } else {
              try {
                const arr = innerParsed;
                effective = {
                  success: arr[arr[0].success],
                  message: arr[arr[0].message]
                };
              } catch {
                effective = {};
              }
            }
          } else if (innerParsed && typeof innerParsed === 'object' && 'success' in innerParsed) {
            effective = innerParsed;
          } else {
            const dv = attemptDevalueParse(topLevel.data);
            if (dv) effective = dv;
          }
        } else {
          effective = topLevel.data;
        }
      }

      if (Array.isArray(effective) && looksLikeDevalueArray(effective)) {
        const re = attemptDevalueParse(JSON.stringify(effective));
        if (re) effective = re;
      }

      const serverResult = extractResult(effective);

      if (!res.ok) {
        errorMessage = serverResult.message || `Upload failed (${res.status})`;
        dispatch('uploaded', { success: false, message: errorMessage });
        return;
      }

      if (!serverResult.success) {
        errorMessage = serverResult.message || 'Upload failed.';
        dispatch('uploaded', { success: false, message: errorMessage });
        return;
      }

      successMessage = serverResult.message || 'Upload successful.';
      dispatch('uploaded', { success: true, message: successMessage });

      // Optional: clear selected files after success
      // selectedFiles = [];

    } catch (err: any) {
      console.error('Upload exception:', err);
      errorMessage = err?.message || 'Unexpected error during upload.';
      dispatch('uploaded', { success: false, message: errorMessage });
    } finally {
      uploading = false;
    }
  }
</script>

<form
  class="flex flex-col gap-4 rounded-box bg-base-200 p-5 md:p-6 w-full md:w-80 lg:w-96 md:shrink-0 md:sticky md:top-4 h-fit"
  on:submit|preventDefault={handleSubmit}
  enctype="multipart/form-data"
>
  <!-- Drop Zone -->
  <div
    class="outline-none"
    tabindex="0"
    on:click={triggerPick}
    on:keydown={onKeyDown}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
    on:dragenter={handleEnter}
    on:dragleave={handleLeave}
  >
    <slot name="dropzone">
      <div id="fallback" class:active={isOver}>
        <FallbackSvg over={isOver} />
      </div>
    </slot>
  </div>

  <input
    id="hidden-input"
    bind:this={input}
    type="file"
    name={multiple ? 'files' : 'file'}
    {multiple}
    {disabled}
    accept=".pdf"
    class="hidden"
    on:change={handleChange}
  />

  {#if selectedFiles.length > 0}
    <div class="selected-files">
      <p class="font-medium mb-1 text-sm">Selected files:</p>
      <ul class="text-xs space-y-1">
        {#each selectedFiles as file}
          <li>
            {file.name}
            (<span class="opacity-70">{Math.round(file.size / 1024)} KB</span>)
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <button
    type="submit"
    class="btn btn-primary justify-center mt-1"
    disabled={selectedFiles.length === 0 || uploading || disabled}
  >
    {#if uploading}
      <span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
      Uploading...
    {:else}
      Submit PDF
    {/if}
  </button>

  {#if errorMessage}
    <div class="alert alert-error mt-2 text-sm">
      <span>{errorMessage}</span>
    </div>
  {/if}

  {#if successMessage}
    <div class="alert alert-success mt-2 text-sm">
      <span>{successMessage}</span>
    </div>
  {/if}

  <p class="text-[11px] leading-snug opacity-60 mt-2">
    Drag & drop a PDF or click. Handles SvelteKit action response format.
  </p>
</form>

<style>
  #fallback {
    display: grid;
    align-items: center;
    width: 100%;
    height: 180px;
    border: 2px dashed #9ca3af;
    border-radius: 10px;
    transition: all 0.2s ease-in-out;
  }
  #fallback.active {
    border-color: #3b82f6;
    background-color: rgba(59,130,246,0.1);
  }
  #fallback :global(svg) {
    margin: auto;
    max-width: 100%;
    max-height: 100%;
  }
  .selected-files {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background-color: color-mix(in srgb, currentColor 6%, transparent);
  }
</style>
