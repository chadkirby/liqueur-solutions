<script lang="ts">

	import NumberSpinner from '../NumberSpinner.svelte';
	import { Mixture, mixtureStore, type AnyComponent } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, componentId, class: classProp }: DisplayProps = $props();

	let abv = $derived(component.abv);
	let proof = $derived(abv * 2);
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>ABV</Helper>
	{#if component instanceof Mixture && component.canEdit('abv')}
		<NumberSpinner
			value={abv}
			format={v => `${format(v, { unit: '%' })}`}
			onValueChange={v => mixtureStore.setAbv(componentId, v)}
			max={100}
		/>
	{:else}
		<ReadOnlyValue>{format(abv, {unit: '%' })}</ReadOnlyValue>
	{/if}
	<Helper class="text-center">{format(proof, {unit: 'proof'})}</Helper>
</div>
