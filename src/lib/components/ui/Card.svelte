<script lang="ts">
  let { class: className = '', ...restProps } = $props();

  let cardClasses = $derived([
    'card-standard',
    className
  ].filter(Boolean).join(' '));
</script>

<div class={cardClasses} {...restProps}>
  <slot />
</div>

<style>
  .card-standard {
    background-color: var(--surface);
    border-radius: var(--radius-card);
    border: 1px solid var(--line);
    padding: 1.5rem;
  }
</style>
