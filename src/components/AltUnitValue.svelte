<script lang="ts">
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	import { brixToSyrupProportion, format, type FormatOptions } from '$lib/utils.js';
	interface Props {
		value: number | number[];
		type: 'mass' | 'volume' | 'brix' | 'abv';
		molecularMass?: number;
	}
	let { value, type, molecularMass }: Props = $props();

	let arrayVal = $derived(Array.isArray(value) ? value : [value]);

	interface Alternate {
		fn: (val: number) => number | string;
		options: FormatOptions;
	}

	const alternates: Alternate[] = $state(
		{
			mass: [
				{ options: { unit: 'g' }, fn: (g: number) => g },
				{ options: { unit: 'oz' }, fn: (g: number) => g / 28.3495 },
				{ options: { unit: 'lb' }, fn: (g: number) => g / 453.592 },
				{ options: { unit: 'kg' }, fn: (g: number) => g / 1000 },
				...(molecularMass
					? [{ options: { unit: 'mol' }, fn: (g: number) => g / molecularMass } satisfies Alternate]
					: []),
			] satisfies Alternate[],
			volume: [
				{ options: { unit: 'ml' }, fn: (v: number) => v },
				{ options: { unit: `fl_oz` }, fn: (v: number) => v * 0.033814 },
				{ options: { unit: 'tsp', decimal: 'decimal' }, fn: (v: number) => v * 0.202884 },
				{ options: { unit: 'tbsp', decimal: 'decimal' }, fn: (v: number) => v * 0.0676288 },
				{ options: { unit: 'cups', decimal: 'fraction' }, fn: (v: number) => v * 0.00422675 },
			] satisfies Alternate[],
			abv: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{ options: { unit: 'proof' }, fn: (v: number) => v * 2 },
			] satisfies Alternate[],
			brix: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{
					options: { unit: '' },
					fn: (v: number) => (v < 100 && v >= 50 ? brixToSyrupProportion(v) : ''),
				},
			] satisfies Alternate[],
		}[type],
	);

	let altIndex = $state(0);

	function rotateAlternates() {
		altIndex = (altIndex + 1) % alternates.length;
	}

	let { fn, options } = $derived(alternates[altIndex]);

	let values = $derived(arrayVal.map(fn));
	let formatOptions = $derived(arrayVal.map(() => options));

</script>

<ReadOnlyValue {values} {formatOptions} onclick={rotateAlternates} />
