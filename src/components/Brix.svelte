<script lang="ts">
	// import { computeSg } from '$lib/utils.js';
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
	// let gravity: number;
	// $: gravity = computeSg(brix);
</script>

<div class="mx-1 grow">
	<NumberSpinner
	{storeId}
	valueType="brix"
	readonly={!/syrup|totals/.test(storeId)}
	label="ºBrix"
	suffix="%"
	keyStep={1}
	keyStepFast={10}
	keyStepSlow={0.1}
	/>
</div>
