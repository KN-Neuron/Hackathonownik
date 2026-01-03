<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    variant = 'default',
    size = 'md',
    disabled = false,
    placeholder = '',
    label = null,
    error = null,
    class: className = '',
    ...restProps
  } = $props<HTMLInputAttributes>();

  let inputClasses = $derived([
    'input',
    'input-bordered',
    'w-full',
    `input-${variant}`,
    `input-${size}`,
    disabled ? 'input-disabled' : '',
    className
  ].filter(Boolean).join(' '));
</script>

<div class="form-control w-full">
  {#if label}
    <label class="label">
      <span class="label-text">{label}</span>
    </label>
  {/if}
  
  <input
    type="text"
    class={inputClasses}
    placeholder={placeholder}
    disabled={disabled}
    {...restProps}
  />
  
  {#if error}
    <label class="label">
      <span class="label-text-alt text-error">{error}</span>
    </label>
  {/if}
</div>

<style>
  .input-default {
    background-color: #1a1f30; /* DaisyUI bg-base-200 */
    border-color: #252d42; /* DaisyUI border-base-300 */
    color: #e5e7eb; /* DaisyUI text-base-content */
  }

  .input-success {
    background-color: #1a1f30; /* DaisyUI bg-base-200 */
    border-color: #36c399; /* DaisyUI border-success */
    color: #e5e7eb; /* DaisyUI text-base-content */
  }

  .input-warning {
    background-color: #1a1f30; /* DaisyUI bg-base-200 */
    border-color: #f7a654; /* DaisyUI border-warning */
    color: #e5e7eb; /* DaisyUI text-base-content */
  }

  .input-error {
    background-color: #1a1f30; /* DaisyUI bg-base-200 */
    border-color: #ff6b6b; /* DaisyUI border-error */
    color: #e5e7eb; /* DaisyUI text-base-content */
  }

  .input-sm {
    padding: 0.25rem 0.5rem; /* px-2 py-1 */
    font-size: 0.875rem; /* text-sm */
  }
  .input-md {
    padding: 0.5rem 0.75rem; /* px-3 py-2 */
    font-size: 1rem; /* text-base */
  }
  .input-lg {
    padding: 0.75rem 1rem; /* px-4 py-3 */
    font-size: 1.125rem; /* text-lg */
  }
</style>