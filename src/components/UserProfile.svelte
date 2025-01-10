<script lang="ts">
	import Corbado from '@corbado/web-js';
	import { onMount } from 'svelte';
	import type { SessionUser } from '@corbado/types';
	import { loadCorbado } from '$lib/corbado-store.js';

	let user: SessionUser | null;



	onMount(async () => {
		await loadCorbado();
		if (Corbado.user) {
			user = Corbado.user;
		} else {
			// redirect to /auth
      window.location.href = '/auth';
		}
	});
</script>

<div>
	{#if user}
		<h1>Profile Page</h1>
		<p>
			User-ID: {user.sub} <br />
			Email: {user.email}
		</p>
	{/if}
</div>
