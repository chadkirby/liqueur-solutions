<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format as _format } from '$lib/utils.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		brix,
		mixtureStore,
		unitSuffix = '%',
		...rest
	}: {
		ingredientId: string;
		brix: number;
		mixtureStore: MixtureStore;
		class?: string;
		divId?: string;
		unitSuffix?: string;
	} = $props();

	const minMax = { min: 0, max: 100 };
	let value = $derived(brix);
	function set(value: number) {
		return mixtureStore.setBrix(ingredientId, value);
	}
	function increment() {
		return mixtureStore.increment('brix', ingredientId, minMax);
	}
	function decrement() {
		return mixtureStore.decrement('brix', ingredientId, minMax);
	}
	function format(value: number) {
		return _format(value, { unit: 'brix' }).value;
	}
</script>

<NumberSpinner
	{value}
	{set}
	{increment}
	{decrement}
	{format}
	{minMax}
	{unitSuffix}
	{...rest}
/>
