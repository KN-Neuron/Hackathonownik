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
  /* Status pill: 24px, tinted fill, colored text, no border */
  span {
    min-height: 24px;
    border: 0 !important;
    line-height: 1;
  }
  .badge-default {
    background-color: rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
  }
  .badge-wellness,
  .badge-success {
    background-color: rgba(54, 195, 153, 0.16);
    color: var(--success);
  }
  .badge-commerce,
  .badge-warning {
    background-color: rgba(247, 166, 84, 0.16);
    color: var(--warning);
  }
  .badge-admin,
  .badge-error {
    background-color: rgba(255, 107, 107, 0.16);
    color: #ff9a9a;
  }
  .badge-jury {
    background-color: rgba(77, 242, 255, 0.14);
    color: var(--focus);
  }
  .badge-sm,
  .badge-md,
  .badge-lg {
    padding: 0.2rem 0.65rem;
    font-size: 0.75rem;
  }
</style>
