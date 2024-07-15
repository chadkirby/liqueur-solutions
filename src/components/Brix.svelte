<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let storeId: string;
	import { mixtureStore } from '$lib';
	$: mixtureStoreData = $mixtureStore; // Subscribe to mixtureStore directly

	let readonly = false;
	$: {
		const components = mixtureStoreData.mixture.components;
		if (storeId === 'totals') {
			readonly = !components.some(c => c.component.canEdit('brix'));
		} else {
			const component = components.find(c => c.id === storeId)?.component;
			readonly = !component?.canEdit('brix');
		}
	}
</script>

<div class="mx-1 grow">
	<NumberSpinner
	{storeId}
	valueType="brix"
	readonly={readonly}
	label="≍Brix"
	suffix="%"
	keyStep={1}
	keyStepFast={10}
	keyStepSlow={0.1}
	/>
</div>
