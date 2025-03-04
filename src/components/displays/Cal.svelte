<script lang="ts">
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import type { DisplayProps } from './display-props.js';

	let {
		ingredientItem: component,
		mass,
		class: classProp,
	}: DisplayProps = $props();
	let value = $derived(component.getKcal(mass));
</script>

<div class={classProp} data-testid="cal-detail">
	<Helper class="tracking-tight">Calories</Helper>
	<ReadOnlyValue values={[value]} formatOptions={[{ unit: 'kcal' }]} />
</div>
