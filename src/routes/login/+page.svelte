<script>
	import '../../app.css';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import Login from '$lib/components/Login.svelte';

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

<Login />
