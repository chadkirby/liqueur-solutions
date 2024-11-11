<script lang="ts">
	import { run } from 'svelte/legacy';

	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore, Sweetener } from '$lib';
	interface Props {
		storeId: string;
	}

	let { storeId }: Props = $props();
	let mixtureStoreData = $derived($mixtureStore); // Subscribe to mixtureStore directly

	let decimals = $state(0);
	run(() => {
		if (storeId !== 'totals') {
			const component = mixtureStoreData.mixture.components.find(c => c.id === storeId)?.component;
			const subtype = (component instanceof Sweetener) ? component.subType : '';
			decimals = (subtype === 'sucralose') ? 1 : 0
			console.log(subtype, decimals);
		}
	});
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
