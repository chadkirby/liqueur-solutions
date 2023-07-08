<script lang="ts">
	import { computeSg } from '$lib/utils.js';
	import NumberSpinner from './NumberSpinner.svelte';
	export let onInput: null | ((event: CustomEvent) => void) = null;
	export let brix: number = 40;
	let showDetails = false;
	let gravity: number;
	$: gravity = computeSg(brix);
</script>

<div class="mx-1">
	<NumberSpinner label="ºBrix" suffix="%" value={brix} {onInput} />
</div>
