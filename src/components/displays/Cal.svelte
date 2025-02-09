<script lang="ts">
	import { isMixture } from '$lib/mixture.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, componentId, mass, class: classProp }: DisplayProps = $props();
	let value = $derived(isMixture(component) ? component.kcal : component.getKcal(mass));
</script>

<div class={classProp} data-testid="cal-{componentId}">
	<Helper class="tracking-tight">Calories</Helper>
	<ReadOnlyValue values={[value]} formatOptions={[{ unit: 'kcal' }]} />
</div>
