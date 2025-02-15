<script lang="ts">
	import { format, type FormatOptions } from '$lib/utils.js';
	interface Props {
		values: Array<number | string>;
		formatOptions: FormatOptions[];
		connector?: string;
		onclick?: () => void;
	}
	let { values, onclick, formatOptions, connector = ', ' }: Props = $props();

	// because of how templates work, we can't precisely control the
	// spacing between items values and suffixes without manually
	// generating the HTML
	let formatted = $derived(
		values.map((val, i) => {
			const formatted = format(val, formatOptions[i]);
			const div = globalThis.document.createElement('div');
			div.textContent = formatted.value;
			if (formatted.suffix) {
				const suffix = div.ownerDocument.createElement('span');
				// Replace spaces with thin spaces
				suffix.textContent = formatted.suffix.replace(/\s/g, '\u2009');
				suffix.classList.add('ml-0.5', 'font-sans');
				div.append(suffix);
			}
			if (i !== values.length - 1) {
				const comma = div.ownerDocument.createElement('span');
				comma.classList.add('font-sans');
				comma.textContent = connector;
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
		{onclick}
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
