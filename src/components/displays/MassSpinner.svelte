<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { format as _format } from '$lib/utils.js';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';

	let {
		ingredientId,
		mass,
		mixtureStore,
		...rest
	}: {
		ingredientId: string;
		mass: number;
		mixtureStore: MixtureStore;
		class?: string;
		divId?: string;
		unitSuffix?: string;
	} = $props();

	const minMax = { min: 0, max: Infinity };
	let value = $derived(mass);
	function set(value: number) {
		return mixtureStore.setMass(ingredientId, value);
	}
	function increment() {
		return mixtureStore.increment('mass', ingredientId, minMax);
	}
	function decrement() {
		return mixtureStore.decrement('mass', ingredientId, minMax);
	}
	function format(value: number) {
		return _format(value, { unit: 'g' }).value;
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
	unitSuffix="g"
/>
