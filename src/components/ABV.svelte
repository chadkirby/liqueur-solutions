<script lang="ts">
	import { run } from 'svelte/legacy';

	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore } from '$lib';
	interface Props {
		storeId: string;
	}

	let { storeId }: Props = $props();
	let mixtureStoreData = $derived($mixtureStore); // Subscribe to mixtureStore directly

	let readonly = $state(false);
	run(() => {
		const components = mixtureStoreData.mixture.components;
		if (storeId === 'totals') {
			readonly = !components.some(c => c.component.canEdit('abv'));
		} else {
			const component = components.find(c => c.id === storeId)?.component;
			readonly = !component?.canEdit('abv');
		}
	});
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
