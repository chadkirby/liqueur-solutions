<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
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
