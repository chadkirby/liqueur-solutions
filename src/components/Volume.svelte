<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';

	import { decimalToFraction } from '../lib/decimal-to-fraction.js';
	export let onInput: null | ((event: CustomEvent) => void) = null;
	export let volume: number = 100;
	let showDetails = false;
	let flOz: number;
	let cups: number;
	$: flOz = volume * 0.033814;
	$: cups = flOz / 8;
	const id = Math.random().toString(36).substring(2);
</script>

<div class="mx-1">
	<NumberSpinner label="Volume" suffix="ml" value={volume} {onInput} />
</div>
