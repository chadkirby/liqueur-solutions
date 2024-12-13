<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { Sweetener } from '$lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';

	let { componentId, component, readonly, class: classProp }: DisplayProps = $props();

	let grams = $derived(component.mass);
</script>

<div class="mx-1 min-w-0 w-full {classProp}" data-testid="mass-{componentId}">
	<Helper class="tracking-tight">Mass</Helper>
	{#if component instanceof Sweetener && !readonly}
		<NumberSpinner
			value={grams}
			type="mass"
			componentId={componentId}
		/>
		<Helper class="text-center">{format(grams / 28.3495, {unit: 'oz'})}</Helper>
	{:else}
		<ReadOnlyValue value={grams} type="mass" />
	{/if}
</div>
