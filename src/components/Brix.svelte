<script lang="ts">
	import { run } from 'svelte/legacy';

	import NumberSpinner from './NumberSpinner.svelte';
	import Textfield from '@smui/textfield';
	import { mixtureStore } from '$lib';
	interface Props {
		storeId: string;
	}

	let { storeId }: Props = $props();

	let readonly = $state(false);

	let showProportion = $state(false);

	let labelClickHandler = () => {
		showProportion = !showProportion;
	};

	let value: number = $state();


	let parts = $state('');

	const candidates = [
			...Array.from({length: 7}, (_, i) => ({ratio: `${i+1}:1`, decimal: xToY(i+1, 1)})),
			...Array.from({length: 6}, (_, i) => ({ratio: `1:${i+2}`, decimal: xToY(1, i+2)})),
			{ratio: `3:2`, decimal: xToY(3, 2)},
			{ratio: `5:2`, decimal: xToY(5, 2)},
			{ratio: `5:4`, decimal: xToY(5, 4)},
			{ratio: `2:3`, decimal: xToY(2,3)},
			{ratio: `4:5`, decimal: xToY(4,5)},
		].sort((a, b) => a.decimal - b.decimal);
	function closestRatio(brix: number) {
		const diffs = candidates.map(x => Math.abs(brix/100 - x.decimal));
		const min = Math.min(...diffs);
		return candidates[diffs.indexOf(min)].ratio;
	}

	function xToY(x: number, y: number) {
		return x / (x + y);
	}

	let mixtureStoreData = $derived($mixtureStore); // Subscribe to mixtureStore directly
	run(() => {
		if (storeId === 'totals') {
			readonly = !mixtureStoreData.mixture.canEdit('brix');
		} else {
			const component = mixtureStoreData.mixture.components.find(c => c.id === storeId)?.component;
			readonly = !component?.canEdit('equivalentSugarMass');
		}
	});
  run(() => {
		if (storeId === 'totals') {
			value = mixtureStoreData.totals.brix ?? 0;
		} else {
			const component = mixtureStoreData.mixture.components.find(c => c.id === storeId)?.component;
		 value = component?.brix ?? 0;
		}
	});
	run(() => {
		if (value < 100) {
			// convert 50 brix to 1/1
			// convert 66.666 brix to 2/1
			// convert 75 brix to 3/1
			parts = closestRatio(value)
			console.log(parts);
		}
	});
</script>

<div class="mx-1 grow">
	<div
		class="mdc-floating-label mdc-floating-label--float-above cursor-pointer"
		onclick={labelClickHandler}
		onkeypress={labelClickHandler}
		role="button"
		tabindex="0"
		>foo</div>

		{#if showProportion}
			<Textfield
				class="w-18 p-1"
				value={parts}
				label="Proportion"
				invalid={value < 0}
				disabled={true}
			/>
		{:else}
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
		{/if}
</div>
