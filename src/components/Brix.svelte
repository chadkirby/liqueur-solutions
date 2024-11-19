<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore, Mixture, type AnyComponent } from '$lib';
	import { Helper, Input } from 'svelte-5-ui-lib';
	import { roundForDisplay } from '$lib/utils.js';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	interface Props {
		componentId: string;
		component: AnyComponent;
	}

	let { componentId, component }: Props = $props();

	let showProportion = $state(false);

	let labelClickHandler = () => {
		showProportion = !showProportion;
	};

	const candidates = [
		xToY(1, 1),
		xToY(5, 4),
		xToY(4, 3),
		xToY(3, 2),
		xToY(5, 3),
		xToY(2, 1),
		xToY(7, 3),
		xToY(5, 2),
		xToY(3, 1),
		xToY(4, 1),
		xToY(5, 1),
		xToY(6, 1),
		xToY(7, 1),
		xToY(8, 1),
		xToY(9, 1),
		xToY(10, 1)
	];
	function closestRatio(brix: number) {
		const diffs = candidates.map((x) => Math.abs(brix / 100 - x.decimal));
		const min = Math.min(...diffs);
		return candidates[diffs.indexOf(min)].ratio;
	}

	function xToY(x: number, y: number) {
		return { ratio: `${x}:${y}`, decimal: x / (x + y) };
	}

	let brix = $derived(component.brix ?? 0);
	// convert 50 brix to 1/1
	// convert 66.666 brix to 2/1
	// convert 75 brix to 3/1
	let parts = $derived(brix < 100 && brix >= 50 ? closestRatio(brix) : '');
</script>

<div class="mx-1 grow">
	<Helper>Sweetness</Helper>

	{#if showProportion}
		<ReadOnlyValue>{parts}</ReadOnlyValue>
	{:else if component instanceof Mixture && component.canEdit('equivalentSugarMass')}
		<NumberSpinner
			value={brix}
			format={(v) => `${roundForDisplay(v)}%`}
			onValueChange={(v) => mixtureStore.setBrix(componentId, v)}
		/>
	{:else}
		<ReadOnlyValue>{roundForDisplay(brix)}%</ReadOnlyValue>
	{/if}
	<Helper class="text-center">{parts}</Helper>
</div>
