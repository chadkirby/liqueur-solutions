<script lang="ts">
	import { computeSg } from '$lib/utils.js';
	import NumberSpinner from './NumberSpinner.svelte';
	export let onInput: null | ((event: CustomEvent) => void) = null;
	export let brix: number = 40;
	export let isLocked: boolean = false;
	let showDetails = false;
	let gravity: number;
	$: gravity = computeSg(brix);
</script>

<div class="mx-1 grow">
	<NumberSpinner
	label="ºBrix"
	suffix="%"
	value={brix}
	{onInput}
	{isLocked}
	keyStep={1}
	keyStepFast={10}
	keyStepSlow={0.1}
	/>
</div>
