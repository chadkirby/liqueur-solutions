<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
	import { mixtureStore, Sweetener } from '$lib';
	$: mixtureStoreData = $mixtureStore; // Subscribe to mixtureStore directly

	let decimals = 0;
	$: {
		if (storeId !== 'totals') {
			const component = mixtureStoreData.mixture.components.find(c => c.id === storeId)?.component;
			const subtype = (component instanceof Sweetener) ? component.subType : '';
			decimals = (subtype === 'sucralose') ? 1 : 0
			console.log(subtype, decimals);
		}
	}
</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="Mass"
		suffix="g"
		{storeId}
		valueType="mass"
		readonly={!/sweetener/.test(storeId)}
		decimals={decimals}
		/>
</div>
