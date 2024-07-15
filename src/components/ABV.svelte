<script lang="ts">
	export let storeId: string;
	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore } from '$lib';
	$: mixtureStoreData = $mixtureStore; // Subscribe to mixtureStore directly

	let readonly = false;
	$: {
		const components = mixtureStoreData.mixture.components;
		if (storeId === 'totals') {
			readonly = !components.some(c => c.component.canEdit('abv'));
		} else {
			const component = components.find(c => c.id === storeId)?.component;
			readonly = !component?.canEdit('abv');
		}
	}
</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="ABV"
		suffix="%"
		{storeId}
		readonly={readonly}
		valueType="abv"
		max={100}
		keyStep={1}
		keyStepFast={10}
		keyStepSlow={0.1}
	/>
</div>
