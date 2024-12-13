<script lang="ts">
	import { brixToSyrupProportion, format, type FormatOptions } from '$lib/utils.js';
	interface Props {
		value: number;
		type: 'mass' | 'volume' | 'brix' | 'abv' | 'kcal';
	}
	let { value, type }: Props = $props();

	interface Alternate {
		fn: (val: number) => number;
		options?: FormatOptions;
	}

	const alternates: Alternate[] = $state(
		{
			mass: [
				{ options: { unit: 'g' }, fn: (g: number) => g },
				{ options: { unit: 'oz' }, fn: (g: number) => g / 28.3495 },
				{ options: { unit: 'lb' }, fn: (g: number) => g / 453.592 },
				{ options: { unit: 'kg' }, fn: (g: number) => g / 1000 }
			] as Alternate[],
			volume: [
				{ options: { unit: 'ml' }, fn: (v: number) => v },
				{ options: { unit: `fl_oz` }, fn: (v: number) => v * 0.033814 },
				{ options: { unit: 'tsp', decimal: 'decimal' }, fn: (v: number) => v * 0.202884 },
				{ options: { unit: 'tbsp', decimal: 'decimal' }, fn: (v: number) => v * 0.0676288 },
				{ options: { unit: 'cups', decimal: 'fraction' }, fn: (v: number) => v * 0.00422675 }
			] as Alternate[],
			abv: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{ options: { unit: 'proof' }, fn: (v: number) => v * 2 }
			] as Alternate[],
			brix: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{
					options: { unit: '' },
					fn: (v: number) => (v < 100 && v >= 50 ? brixToSyrupProportion(v) : '')
				}
			] as Alternate[],
			kcal: [{ options: { unit: 'kcal' }, fn: (v: number) => v }] as Alternate[]
		}[type]
	);

	let altIndex = $state(0);

	function rotateAlternates() {
		altIndex = (altIndex + 1) % alternates.length;
	}

	let { fn, options } = $derived(alternates[altIndex]);
	let formatted = $derived(format(fn(value), options));
	let suffixSize = $derived(formatted.suffix.length > 2 ? 'text-[11px]' : '');
</script>

<output class="flex items-center whitespace-nowrap font-mono leading-[18px] text-xs ">
	<button
		onclick={rotateAlternates}
		class="
		cursor-pointer
		font-normal font-mono
		text-right
		w-full px-0.5 py-0.5
		border
		border-primary-200
		dark:border-primary-800
		rounded-md
		text-primary-600
		dark:text-primary-400
  "
	>
			{formatted.value}
	</button><span class="{suffixSize} ml-0.5">
		{formatted.suffix}
	</span>
</output>
