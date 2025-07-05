<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { persistenceContext } from '$lib/persistence.js';
	import { page } from '$app/state';
	import { isStorageId } from '$lib/storage-id.js';

	const mxId = isStorageId(page.params.id) ? page.params.id : null;
  if (mxId) persistenceContext.getIngredientsCollection(mxId);

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();

  onMount(async () => {
    await persistenceContext.isReady();
  });
</script>

{@render children?.()}
