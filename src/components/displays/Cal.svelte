<script lang="ts">
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, componentId, class: classProp }: DisplayProps = $props();
	let value = $derived(component.kcal);
</script>

<div class="mx-1 grow {classProp}" data-testid="cal-{componentId}">
	<Helper class="tracking-tight">Calories</Helper>
	<ReadOnlyValue type="kcal" {value}/>
</div>
