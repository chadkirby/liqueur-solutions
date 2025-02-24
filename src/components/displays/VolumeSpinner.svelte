<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format as _format } from '$lib/utils.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		volume,
		mixtureStore,
		...rest
	}: {
		ingredientId: string;
		volume: number;
		mixtureStore: MixtureStore;
		class?: string;
		divId?: string;
		unitSuffix?: string;
	} = $props();

	let value = $derived(volume);

	const minMax = { min: 0, max: Infinity };

	function set(value: number) {
		return mixtureStore.setVolume(ingredientId, value);
	}
	function increment() {
		return mixtureStore.increment('volume', ingredientId, minMax);
	}
	function decrement() {
		return mixtureStore.decrement('volume', ingredientId, minMax);
	}
	function format(value: number) {
		return _format(value, { unit: 'ml' }).value;
	}
</script>

<NumberSpinner
	{value}
	{set}
	{increment}
	{decrement}
	{format}
	{minMax}
	{...rest}
	unitSuffix="ml"
/>
