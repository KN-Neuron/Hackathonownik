<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    href = null,
    class: className = '',
    ...restProps
  } = $props<HTMLButtonAttributes>();

  let buttonClasses = $derived([
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    disabled ? 'btn-disabled' : '',
    loading ? 'loading' : '',
    fullWidth ? 'w-full' : '',
    className
  ].filter(Boolean).join(' '));
</script>

{#if href}
  <a 
    href={href} 
    class={buttonClasses}
    role="button"
    aria-busy={loading}
    {...restProps}
  >
    {#if loading}
      <span class="loading loading-spinner"></span>
    {/if}
    <slot />
  </a>
{:else}
  <button
    type="button"
    class={buttonClasses}
    disabled={disabled || loading}
    aria-busy={loading}
    {...restProps}
  >
    {#if loading}
      <span class="loading loading-spinner"></span>
    {/if}
    <slot />
  </button>
{/if}

<style>
  /* One button set: 44px high, flat fills, dark text on the violet action */
  .btn {
    min-height: 44px;
    border-radius: var(--radius-control);
    font-weight: 600;
    font-size: 14px;
    box-shadow: none;
  }

  .btn-primary,
  .btn-jury {
    background-color: var(--action);
    color: var(--action-content);
    border-color: var(--action);
  }

  .btn-primary:hover,
  .btn-jury:hover {
    background-color: var(--action-hover);
    border-color: var(--action-hover);
  }

  /* Ghost-style secondary */
  .btn-secondary {
    background-color: transparent;
    color: var(--text);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }

  .btn-success,
  .btn-wellness {
    background-color: var(--success);
    color: #062a1f;
    border-color: var(--success);
  }

  .btn-warning,
  .btn-commerce {
    background-color: var(--warning);
    color: #1c1200;
    border-color: var(--warning);
  }

  .btn-error,
  .btn-admin {
    background-color: var(--error);
    color: #2a0808;
    border-color: var(--error);
  }

  .btn-sm {
    padding: 0 0.75rem;
  }
  .btn-md {
    padding: 0 1.25rem;
  }
  .btn-lg {
    padding: 0 1.5rem;
    font-size: 1rem;
    min-height: 48px;
  }
</style>
