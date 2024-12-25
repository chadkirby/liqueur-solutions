<script lang="ts">
	import { Sweetener } from '$lib/index.svelte';
	import NumberSpinner from '../NumberSpinner.svelte';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import { format } from '$lib/utils.js';

	let { componentId, component, mixtureStore, readonly, class: classProp }: DisplayProps = $props();

	let ml = $derived(component.volume);
</script>

<div class="mx-1 min-w-0 w-full {classProp}" data-testid={`volume-${componentId}`}>
	<Helper class="tracking-tight">Volume</Helper>
	{#if component instanceof Sweetener || readonly}
		<ReadOnlyValue value={ml} type="volume" />
	{:else}
		<NumberSpinner {mixtureStore} value={ml} type="volume" {componentId} />
		<Helper class="text-center">{format(ml * 0.033814, { unit: 'fl_oz' })}</Helper>
	{/if}
</div>
