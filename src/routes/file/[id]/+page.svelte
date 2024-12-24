<script lang="ts">
	import type { LoadData } from './types.js';
	import MixtureList from '../../../components/MixtureList.svelte';
	import BottomNav from '../../../components/nav/BottomNav.svelte';
	import { loadingStoreId, MixtureStore } from '$lib/mixture-store.svelte.js';
	import { Spinner } from 'svelte-5-ui-lib';
	import { filesDb } from '$lib/storage.svelte.js';

	interface Props {
		data: LoadData;
	}

	let { data }: Props = $props();
	const { storeId, mixture, name, totals } = data;

	let title = $state(`${name} - Liqueur Solutions`);
	const mixtureStore = mixture && totals
		? new MixtureStore({ storeId, name, mixture, totals })
		: null;

	$inspect(storeId, name, mixtureStore);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="p-2 max-w-lg mx-auto font-sans">
	{#if storeId === loadingStoreId || mixtureStore === null}
		<Spinner size="16" />
	{:else}
		<MixtureList {mixtureStore} />
		<BottomNav {mixtureStore} />
	{/if}
</div>
