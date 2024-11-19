<script lang="ts">

	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore, Sweetener, type AnyComponent } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { roundForDisplay } from '$lib/utils.js';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	interface Props {
		componentId: string;
		component: AnyComponent
	}

	let { componentId, component }: Props = $props();

	let grams = $derived(component.mass);
	let ounces = $derived(grams/ 28.3495);

</script>

<div class="mx-1 grow">
	<Helper>Mass</Helper>
	{#if component instanceof Sweetener}
		<NumberSpinner
			value={grams}
			format={v => `${roundForDisplay(v)}g`}
			onValueChange={v => mixtureStore.setMass(componentId, v)}
		/>
	{:else}
		<ReadOnlyValue>{roundForDisplay(grams)}g</ReadOnlyValue>
	{/if}
	<Helper class="text-center">{roundForDisplay(ounces)}oz</Helper>
</div>
