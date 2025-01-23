<script lang="ts">
	import { brixToSyrupProportion, format, type FormatOptions } from '$lib/utils.js';
	interface Props {
		value: number | number[];
		type: 'mass' | 'volume' | 'brix' | 'abv' | 'kcal' | 'pH' | 'density';
		molecularMass?: number;
	}
	let { value, type, molecularMass }: Props = $props();

	let arrayVal = $derived(Array.isArray(value) ? value : [value]);

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
				{ options: { unit: 'kg' }, fn: (g: number) => g / 1000 },
				...(molecularMass
					? [{ options: { unit: 'mol' }, fn: (g: number) => g / molecularMass }]
					: []),
			] as Alternate[],
			volume: [
				{ options: { unit: 'ml' }, fn: (v: number) => v },
				{ options: { unit: `fl_oz` }, fn: (v: number) => v * 0.033814 },
				{ options: { unit: 'tsp', decimal: 'decimal' }, fn: (v: number) => v * 0.202884 },
				{ options: { unit: 'tbsp', decimal: 'decimal' }, fn: (v: number) => v * 0.0676288 },
				{ options: { unit: 'cups', decimal: 'fraction' }, fn: (v: number) => v * 0.00422675 },
			] as Alternate[],
			abv: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{ options: { unit: 'proof' }, fn: (v: number) => v * 2 },
			] as Alternate[],
			brix: [
				{ options: { unit: '%' }, fn: (v: number) => v },
				{
					options: { unit: '' },
					fn: (v: number) => (v < 100 && v >= 50 ? brixToSyrupProportion(v) : ''),
				},
			] as Alternate[],
			kcal: [{ options: { unit: 'kcal' }, fn: (v: number) => v }] as Alternate[],
			pH: [{ options: { unit: 'pH' }, fn: (v: number) => v }] as Alternate[],
			density: [{ options: { unit: 'g/ml' }, fn: (v: number) => v }] as Alternate[],
		}[type],
	);

	let altIndex = $state(0);

	function rotateAlternates() {
		altIndex = (altIndex + 1) % alternates.length;
	}

	let { fn, options } = $derived(alternates[altIndex]);

	// because of how templates work, we can't precisely control the
	// spacing between items values and suffixes without manually
	// generating the HTML
	let formatted = $derived(
		arrayVal.map((val, i) => {
			const formatted = format(fn(val), options);
			const div = globalThis.document.createElement('div');
			div.textContent = formatted.value;
			if (formatted.suffix) {
				const suffix = div.ownerDocument.createElement('span');
				// Replace spaces with thin spaces
				suffix.textContent = formatted.suffix.replace(/\s/g, '\u2009');
				suffix.classList.add('ml-0.5', 'font-sans');
				div.append(suffix);
			}
			if (i !== arrayVal.length - 1) {
				const comma = div.ownerDocument.createElement('span');
				comma.classList.add('font-sans');
				comma.textContent = ', ';
				div.append(comma);
			}
			return div.innerHTML;
		}),
	);
</script>

<output
	class={['flex', 'items-center', 'whitespace-nowrap', 'font-mono', 'leading-[18px]', 'text-xs']}
>
	<button
		onclick={rotateAlternates}
		class="
		cursor-pointer
		font-normal font-mono
		text-center
		w-full px-0.5 py-0.5
		border
		border-primary-200
		dark:border-primary-800
		rounded-md
		text-primary-600
		dark:text-primary-400
  "
	>
		{#each formatted as html}
			{@html html}
		{/each}
	</button>
</output>
