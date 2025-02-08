<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { isMixture, Mixture } from '$lib/mixture.js';
	import Helper from '../ui-primitives/Helper.svelte';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, componentId, mixtureStore, readonly, class: classProp }: DisplayProps = $props();

	if (!isMixture(component)) {
		throw new Error('Component must be a Mixture');
	}

	let pH = $derived(component.pH);
</script>

<div class={classProp} data-testid="ph-{componentId}">
	<Helper class="tracking-tight">𝗉𝖧</Helper>
	{#if !readonly && component instanceof Mixture && component.canEdit('abv')}
		<NumberSpinner {mixtureStore} value={pH} type="pH" {componentId} max={100} />
	{:else}
		<ReadOnlyValue value={pH} type="pH" />
	{/if}
</div>
