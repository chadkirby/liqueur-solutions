<script lang="ts">
	import { decimalToFraction } from '../lib/decimal-to-fraction.js';
	export let id: string;
	export let onInput: null | ((event: Event) => void) = null;
	export let volume: number = 100;
	let showDetails = false;
	let flOz: number;
	let cups: number;
	$: flOz = volume * 0.033814;
	$: cups = flOz / 8;

</script>

<div class="flex items-center justify-start space-x-4">
	<div>
		<button on:click={() => showDetails = !showDetails}>
			{showDetails ? '▼' : '▶'}
		</button>
		<label for={id}>Volume:</label>
		{#if onInput}
			<input
				{id}
				type="number"
				bind:value={volume}
				on:input={onInput}
				class="w-20 rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}"
			/> ml
		{:else}
			<span class="w-16 rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}"
			>{volume} ml</span>
		{/if}
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p
					class="rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}"
				>{flOz.toFixed(1)} fl oz</p>
				<p
					class="rounded border px-2 py-1 {volume < 0 ? 'ring-2 ring-red-500' : ''}"
				>{decimalToFraction(cups)} cups</p>
			</div>
		{/if}
	</div>
</div>
