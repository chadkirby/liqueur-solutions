<script lang="ts">

	import NumberSpinner from '../NumberSpinner.svelte';
	import { Mixture } from '$lib/index.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, componentId, mixtureStore, readonly, class: classProp }: DisplayProps = $props();

	let abv = $derived(component.abv);
	let proof = $derived(abv * 2);
</script>

<div class="mx-1 min-w-0 w-full {classProp}" data-testid="abv-{componentId}">
	<Helper class="tracking-tight">ABV</Helper>
	{#if !readonly && component instanceof Mixture && component.canEdit('abv')}
		<NumberSpinner
			{mixtureStore}
			value={abv}
			type="abv"
			componentId={componentId}
			max={100}
		/>
		<Helper class="text-center">{format(proof, {unit: 'proof'})}</Helper>
		{:else}
		<ReadOnlyValue value={abv} type="abv" />
	{/if}
</div>
