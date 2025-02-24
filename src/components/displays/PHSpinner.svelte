<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format as _format } from '$lib/utils.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		pH,
		mixtureStore,
		...rest
	}: {
		ingredientId: string;
		pH: number;
		mixtureStore: MixtureStore;
		class?: string;
		divId?: string;
		unitSuffix?: string;
	} = $props();

	const minMax = { min: 0, max: 14 };
	let value = $derived(pH);
	function set(value: number) {
		return mixtureStore.setPH(ingredientId, value);
	}
	function increment() {
		return mixtureStore.increment('pH', ingredientId, minMax);
	}
	function decrement() {
		return mixtureStore.decrement('pH', ingredientId, minMax);
	}
	function format(value: number) {
		return _format(value, { unit: 'pH' }).value;
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
/>
