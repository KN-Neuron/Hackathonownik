<script>
  import "../../app.css";
  import { pb } from '$lib/pocketbase';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';
  async function handleRegister() {
    error = '';
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      goto('/');
    } catch (e) {
      error = e.message || 'Register failed';
    }
  }
</script>

<h2 class="text-4xl">Register</h2>
<form on:submit|preventDefault={handleRegister}>
  <input class="input" type="email" bind:value={email} placeholder="Email" required />
  <input class="input" type="password" bind:value={password} placeholder="Password" required />
  <button class="btn" type="submit">Register</button>
  {#if error}<div style="color:red">{error}</div>{/if}
</form>
