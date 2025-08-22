<script>
  import "../../app.css";
  import { pb } from '$lib/pocketbase';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';

  async function handleLogin() {
    error = '';
    try {
      await pb.collection('users').authWithPassword(email, password);
      goto('/');
    } catch (e) {
      error = 'Invalid credentials';
    }
  }
</script>

<h2 class="text-4xl">Login</h2>
<form on:submit|preventDefault={handleLogin}>
  <input class="input" type="email" bind:value={email} placeholder="Email" required />
  <input class="input" type="password" bind:value={password} placeholder="Password" required />
  <button class="btn" type="submit">Login</button>
  {#if error}<div style="color:red">{error}</div>{/if}
</form>
