<script lang="ts">
	import { isMixture, Mixture } from '$lib/mixture.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import type { DisplayProps } from './display-props.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import { format as _format } from '$lib/utils.js';
	import PhSpinner from './PHSpinner.svelte';

	let {
		ingredientItem: component,
		ingredientId,
		mixtureStore,
		readonly,
		class: classProp,
	}: DisplayProps = $props();

	if (!isMixture(component)) {
		throw new Error('Component must be a Mixture');
	}

	let pH = $derived(component.pH);
</script>

<div class={classProp} data-testid="ph-detail">
	<Helper class="tracking-tight">𝗉𝖧</Helper>
	{#if !readonly && component instanceof Mixture && component.canEdit('abv')}
		<PhSpinner {ingredientId} {pH} {mixtureStore} />
	{:else}
		<ReadOnlyValue values={[pH]} formatOptions={[{ unit: 'pH' }]} />
	{/if}
</div>
