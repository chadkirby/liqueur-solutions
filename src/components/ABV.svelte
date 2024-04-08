<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
	// let proof: number;
	// $: proof = abv * 2;
</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="ABV"
		suffix="%"
		{storeId}
		valueType="abv"
		max={100}
		keyStep={1}
		keyStepFast={10}
		keyStepSlow={0.1}
	/>
</div>
