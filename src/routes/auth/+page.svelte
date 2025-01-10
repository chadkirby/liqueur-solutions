<script lang="ts">
	import { loadCorbado } from '$lib/corbado-store.js';
	import Corbado from '@corbado/web-js';
	import { onMount } from 'svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();

	let authElement: HTMLDivElement;

	onMount(async () => {
		await loadCorbado();
		Corbado.mountAuthUI(authElement, {
			onLoggedIn: () => {
				// Redirect to the next page
				window.location.href = data.next;
			}
		});
	});
</script>

<div bind:this={authElement}></div>
