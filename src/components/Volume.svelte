<script lang="ts">
	import { mixtureStore, Sweetener, type AnyComponent } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import NumberSpinner from './NumberSpinner.svelte';
	import { roundForDisplay } from '$lib/utils.js';
	import ReadOnlyValue from './ReadOnlyValue.svelte';

	interface Props {
		componentId: string; // let flOz: number;
		component: AnyComponent;
	}

	let { componentId, component }: Props = $props();

	// let cups: number;
	// $: flOz = volume * 0.033814;
	// $: cups = flOz / 8;

	let value = $derived(component.volume);
	let mass = $derived(component.mass);
</script>

<div class="mx-1 grow">
	<Helper>Volume</Helper>
	{#if component instanceof Sweetener}
		<ReadOnlyValue>{roundForDisplay(value)}ml</ReadOnlyValue>
	{:else}
		<NumberSpinner
			{value}
			format={v => `${roundForDisplay(v)}ml`}
			onValueChange={v => mixtureStore.setVolume(componentId, v)}
		/>
		<Helper class="text-center">{roundForDisplay(mass)}g</Helper>
	{/if}
</div>
