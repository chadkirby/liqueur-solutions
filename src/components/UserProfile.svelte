<script lang="ts">
	import Corbado from '@corbado/web-js';
	import { onMount } from 'svelte';
	import type { SessionUser } from '@corbado/types';

	let user: SessionUser | null;

	onMount(async () => {
		const { default: Corbado } = await import('@corbado/web-js');
		if (Corbado.user) {
			user = Corbado.user;
		} else {
			// redirect to /auth
      window.location.href = '/auth';
		}
	});

	async function handleLogout() {
		try {
			await Corbado.logout();
			window.location.href = '/auth';
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}


</script>
<div class="p-8 flex justify-center items-start min-h-screen">
	{#if user}
		<div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
			<h1 class="text-2xl font-semibold text-gray-800 mb-6">Profile</h1>
			<div class="space-y-4 mb-8">
				<div class="pb-2 border-b border-gray-200">
					<span class="text-gray-600 font-medium mr-2">User ID:</span>
					<span class="text-gray-800">{user.sub}</span>
				</div>
				<div class="pb-2 border-b border-gray-200">
					<span class="text-gray-600 font-medium mr-2">Email:</span>
					<span class="text-gray-800">{user.email}</span>
				</div>
			</div>
			<button
				class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
				on:click={handleLogout}
			>
				Log Out
			</button>
		</div>
	{/if}
</div>

<style>

</style>
