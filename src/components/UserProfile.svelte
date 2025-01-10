<script lang="ts">
	import Corbado from '@corbado/web-js';
	import { onMount } from 'svelte';
	import type { SessionUser } from '@corbado/types';

	let user: SessionUser | null;



	onMount(async () => {
		const { loadCorbado } = await import('$lib/corbado-store.js');
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
