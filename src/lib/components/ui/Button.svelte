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
  .btn-primary {
    background-color: var(--brand-purple);
    color: white;
    border-color: var(--brand-purple);
  }

  .btn-primary:hover {
    background-color: #6a66e6;
  }

  .btn-secondary {
    background-color: #252d42; /* DaisyUI base-300 */
    color: #e5e7eb; /* DaisyUI base-content */
    border-color: #252d42; /* DaisyUI base-300 */
  }

  .btn-secondary:hover {
    background-color: #3a3d4a;
  }

  .btn-success {
    background-color: var(--success);
    color: white;
    border-color: var(--success);
  }

  .btn-success:hover {
    background-color: #2da57f;
  }

  .btn-warning {
    background-color: var(--warning);
    color: white;
    border-color: var(--warning);
  }

  .btn-warning:hover {
    background-color: #e5954a;
  }

  .btn-error {
    background-color: var(--error);
    color: white;
    border-color: var(--error);
  }

  .btn-error:hover {
    background-color: #e55a5a;
  }

  .btn-wellness {
    background: linear-gradient(to right, var(--wellness-color), #2a9d7f);
    color: white;
    border-color: var(--wellness-color);
  }

  .btn-wellness:hover {
    background: linear-gradient(to right, #2da57f, #2a8f6d);
  }

  .btn-commerce {
    background: linear-gradient(to right, var(--commerce-color), #e58e2a);
    color: white;
    border-color: var(--commerce-color);
  }

  .btn-commerce:hover {
    background: linear-gradient(to right, #e5954a, #d67e22);
  }

  .btn-admin {
    background: linear-gradient(to right, var(--admin-color), #ee5a6f);
    color: white;
    border-color: var(--admin-color);
  }

  .btn-admin:hover {
    background: linear-gradient(to right, #e55a6a, #d64e5f);
  }

  .btn-jury {
    background: linear-gradient(to right, var(--jury-color), var(--brand-purple));
    color: var(--jury-dark);
    border-color: var(--jury-color);
  }

  .btn-jury:hover {
    background: linear-gradient(to right, #3db9e0, #6a66e6);
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem; /* px-3 py-1.5 */
    font-size: 0.875rem; /* text-sm */
  }
  .btn-md {
    padding: 0.5rem 1rem; /* px-4 py-2 */
    font-size: 1rem; /* text-base */
  }
  .btn-lg {
    padding: 0.75rem 1.5rem; /* px-6 py-3 */
    font-size: 1.125rem; /* text-lg */
  }
</style>