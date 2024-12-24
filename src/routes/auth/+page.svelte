<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();

	let authElement: HTMLDivElement;

	onMount(async () => {
		const { default: Corbado } = await import('@corbado/web-js');
		Corbado.mountAuthUI(authElement, {
			onLoggedIn: () => {
				// Redirect to the next page
				window.location.href = data.next;
			}
		});
	});
</script>

<div bind:this={authElement}></div>
