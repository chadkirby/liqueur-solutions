<script lang="ts">
	import { type Sweetener,  } from '$lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import { SweetenerEquivData } from '$lib/sweetener.js';
	import type { DisplayProps } from './display-props.js';
	import Helper from '../ui-primitives/Helper.svelte';

	let { component, class: classProp }: DisplayProps & {component: Sweetener} = $props();

	let esm = $derived(component.equivalentSugarMass);
	let equivCal = $derived(esm * SweetenerEquivData.sucrose.kcalPerGram);
</script>

<div class="mx-1 min-w-0 w-full {classProp}">
	<Helper>≈ Sugar</Helper>
	<ReadOnlyValue value={esm} type="mass" />
	<Helper class="text-center">{format(equivCal, { unit: 'kcal' })}</Helper>
</div>
