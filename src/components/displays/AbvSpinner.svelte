<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format as _format } from '$lib/utils.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		abv,
		mixtureStore,
		unitSuffix = '%',
		...rest
	}: {
		ingredientId: string;
		abv: number;
		mixtureStore: MixtureStore;
		class?: string;
		divId?: string;
		unitSuffix?: string;
	} = $props();

	const minMax = { min: 0, max: 100 };
	let value = $derived(abv);
	function set(value: number) {
		return mixtureStore.setAbv(ingredientId, value);
	}
	function increment() {
		return mixtureStore.increment('abv', ingredientId, minMax);
	}
	function decrement() {
		return mixtureStore.decrement('abv', ingredientId, minMax);
	}
	function format(value: number) {
		return _format(value, { unit: '%' }).value;
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
