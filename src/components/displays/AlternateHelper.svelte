<script lang="ts">
	import { format, type FormatOptions } from '$lib/utils.js';
	import Helper from '../ui-primitives/Helper.svelte';

	export interface Alternate {
		fn: (val: number) => number;
		options?: FormatOptions;
	}

	let { alternates, base }: { base: number, alternates: Alternate[] } = $props();

	let whichAlternate = $state(0);
	function nextAlternate() {
		whichAlternate = (whichAlternate + 1) % alternates.length;
	}
	let currentAlternate = $derived(alternates[whichAlternate]);
	let formatted = $derived(format(currentAlternate.fn(base), currentAlternate.options));
</script>

<Helper class="text-center cursor-pointer" onclick={nextAlternate}>
	{formatted.value}<span class="text-xs italic">{formatted.suffix}</span>
</Helper>
