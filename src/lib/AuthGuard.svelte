<script>
  import { pb } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  let show = false;
  onMount(() => {
    if (!pb.authStore.isValid) {
      goto('/login');
    } else {
      show = true;
    }
  });
</script>

{#if show}
  <slot />
{:else}
  <!-- Optionally show loading -->
{/if}
