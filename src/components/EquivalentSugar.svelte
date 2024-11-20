<script lang="ts">
	import { type Sweetener,  } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { roundForDisplay } from '$lib/utils.js';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import { SweetenerEquivData } from '$lib/sweetener.js';
	interface Props {
		component: Sweetener
	}

	let { component }: Props = $props();

	let esm = $derived(component.equivalentSugarMass);
	let equivCal = $derived(esm * SweetenerEquivData.sucrose.kcalPerGram);
</script>

<div class="mx-1 grow">
	<Helper>Equiv. Sugar</Helper>
	<ReadOnlyValue>{roundForDisplay(esm)}g</ReadOnlyValue>
	<Helper class="text-center">{roundForDisplay(equivCal)}kcal</Helper>
</div>
