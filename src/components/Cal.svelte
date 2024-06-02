<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
</script>

<div class="mx-1 grow">
	<NumberSpinner
	{storeId}
	valueType="kcal"
	readonly={true}
	label="kcal"
	suffix="kcal"
	/>
</div>
