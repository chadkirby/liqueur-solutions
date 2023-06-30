<script lang="ts">
	import Textfield from '@smui/textfield';
	import IconButton from '@smui/icon-button';

	import { decimalToFraction } from '../lib/decimal-to-fraction.js';
	export let onInput: null | ((event: Event) => void) = null;
	export let volume: number = 100;
	let showDetails = false;
	let flOz: number;
	let cups: number;
	$: flOz = volume * 0.033814;
	$: cups = flOz / 8;
</script>

<div class="flex items-center justify-start space-x-4">
	<IconButton class="material-icons" size="mini" on:click={() => (showDetails = !showDetails)}
		>{showDetails ? 'arrow_drop_down' : 'arrow_right'}</IconButton
	>
	<div>
		<Textfield
			class="w-20"
			bind:value={volume}
			label="Volume"
			type="number"
			on:input={onInput ? onInput : () => {}}
			suffix="ml"
			invalid={volume < 0}
			disabled={onInput === null}
		/>
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p class="rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}">
					{flOz.toFixed(1)} fl oz
				</p>
				<p class="rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}">
					{decimalToFraction(cups)}
					{cups > 1 ? 'cups' : 'cup'}
				</p>
			</div>
		{/if}
	</div>
</div>
