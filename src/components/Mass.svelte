<script lang="ts">
	import { decimalToFraction } from '../lib/decimal-to-fraction.js';
	export let id: string;
	export let onInput: null | ((event: Event) => void);

	export let mass: number = 100; // grams
	let showDetails = false;
	let ounces: number;
	$: ounces = mass * 0.035274;

</script>

<div class="flex items-center justify-start space-x-3">
	<div>
		<button on:click={() => showDetails = !showDetails}>
			{showDetails ? '▼' : '▶'}
		</button>
		<label for={id}>Mass:</label>
		{#if onInput}
			<input
				{id}
				type="number"
				bind:value={mass}
				on:input={onInput}
				class="w-20 rounded border px-2 py-1"
			/> g
		{:else}
			<span>{mass} g</span>
		{/if}

		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p
				class="rounded border px-2 py-1 {mass < 0 ? 'ring-2 ring-red-500' : ''}"
				>{ounces.toFixed(1)} oz</p>
			</div>
		{/if}
	</div>
</div>
