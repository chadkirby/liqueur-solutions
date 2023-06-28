<script lang="ts">
	export let id: string;
	export let onInput: (event: Event) => void;
	export let abv: number = 40;
	let showDetails = false;
	let proof: number;
	$: proof = abv * 2;

</script>

<div class="flex items-center justify-start space-x-3">
	<div>
		<button on:click={() => showDetails = !showDetails}>
			{showDetails ? '▼' : '▶'}
		</button>
		<label for={id}>ABV:</label>
		<input
			{id}
			type="number"
			bind:value={abv}
			on:input={onInput}
			class="w-16 rounded border px-2 py-1"
		/> %
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p
					class="w-16 rounded border px-2 py-1 {abv < 0 ? 'ring-2 ring-red-500' : ''}"
				>{proof.toFixed(1)} proof</p>
			</div>
		{/if}
	</div>
</div>
