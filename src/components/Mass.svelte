<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
	// let ounces: number;
	// $: ounces = mass * 0.035274;
</script>

<div class="mx-1 grow">
	<NumberSpinner label="Mass" suffix="g" {storeId} valueType="mass" readonly={!/sugar/.test(storeId)} />
</div>
