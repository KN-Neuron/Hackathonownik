<script lang="ts">
  let {
    variant = 'default',
    size = 'md',
    class: className = '',
    ...restProps
  } = $props();

  let badgeClasses = $derived([
    'inline-flex items-center border rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    `badge-${variant}`,
    `badge-${size}`,
    className
  ].filter(Boolean).join(' '));
</script>

<span class={badgeClasses} {...restProps}>
  <slot />
</span>

<style>
  .badge-default {
    background-color: #252d42; /* DaisyUI base-300 */
    color: #e5e7eb; /* DaisyUI base-content */
    border-color: #252d42; /* DaisyUI base-300 */
  }

  .badge-wellness {
    background-color: rgba(54, 195, 153, 0.2);
    color: var(--wellness-color);
    border: 1px solid rgba(54, 195, 153, 0.3);
  }

  .badge-commerce {
    background-color: rgba(247, 166, 84, 0.2);
    color: var(--commerce-color);
    border: 1px solid rgba(247, 166, 84, 0.3);
  }

  .badge-admin {
    background-color: rgba(255, 107, 107, 0.2);
    color: var(--admin-color);
    border: 1px solid rgba(255, 107, 107, 0.3);
  }

  .badge-jury {
    background-color: rgba(77, 242, 255, 0.2);
    color: var(--jury-color);
    border: 1px solid rgba(77, 242, 255, 0.3);
  }

  .badge-success {
    background-color: rgba(54, 195, 153, 0.2);
    color: var(--success);
    border: 1px solid rgba(54, 195, 153, 0.3);
  }

  .badge-warning {
    background-color: rgba(247, 166, 84, 0.2);
    color: var(--warning);
    border: 1px solid rgba(247, 166, 84, 0.3);
  }

  .badge-error {
    background-color: rgba(255, 107, 107, 0.2);
    color: var(--error);
    border: 1px solid rgba(255, 107, 107, 0.3);
  }

  .badge-sm {
    padding: 0.125rem 0.5rem; /* px-2 py-0.5 */
    font-size: 0.75rem; /* text-xs */
  }
  .badge-md {
    padding: 0.25rem 0.75rem; /* px-3 py-1 */
    font-size: 0.875rem; /* text-sm */
  }
  .badge-lg {
    padding: 0.375rem 1rem; /* px-4 py-1.5 */
    font-size: 1rem; /* text-base */
  }
</style>