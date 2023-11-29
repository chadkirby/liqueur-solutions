<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';

	import { decimalToFraction } from '../lib/decimal-to-fraction.js';
	export let onInput: null | ((event: CustomEvent) => void) = null;
	export let volume: number = 100;
	export let isLocked: boolean = false;
	let showDetails = false;
	let flOz: number;
	let cups: number;
	$: flOz = volume * 0.033814;
	$: cups = flOz / 8;
</script>

<div class="mx-1 grow">
	<NumberSpinner label="Volume" suffix="ml" value={volume} {isLocked} {onInput} />
</div>
