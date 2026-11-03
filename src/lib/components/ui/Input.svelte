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
  .label-text {
    font-size: 13px;
    font-weight: 600;
    color: #c9cfdd;
  }
  .input {
    min-height: 48px;
    border-radius: var(--radius-control);
    font-size: 15px;
    background-color: var(--base-100);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.14);
  }
  .input:focus {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-color: var(--focus);
  }
  .input-success {
    border-color: var(--success);
  }
  .input-warning {
    border-color: var(--warning);
  }
  .input-error {
    border-color: var(--error);
  }
</style>
