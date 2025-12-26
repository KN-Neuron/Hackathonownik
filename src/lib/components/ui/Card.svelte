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
    background-color: #1a1f30; /* DaisyUI bg-base-200 */
    border-radius: 0.5rem; /* DaisyUI rounded-box */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* DaisyUI shadow-md */
    border: 1px solid #252d42; /* DaisyUI border-base-300 */
    padding: 1.5rem; /* DaisyUI p-6 */
  }
</style>