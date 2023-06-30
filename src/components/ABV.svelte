<script lang="ts">
	import Textfield from '@smui/textfield';
	import IconButton from '@smui/icon-button';
	export let onInput: (event: Event) => void;
	export let abv: number = 40;
	let showDetails = false;
	let proof: number;
	$: proof = abv * 2;
</script>

<div class="flex items-center justify-start space-x-3">
	<IconButton class="material-icons" on:click={() => (showDetails = !showDetails)}
		>{showDetails ? 'arrow_drop_down' : 'arrow_right'}</IconButton
	>
	<div>
		<Textfield
			class="w-20"
			bind:value={abv}
			label="ABV"
			type="number"
			on:input={onInput}
			suffix="%"
			invalid={abv < 0}
		/>
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p class="rounded border px-2 py-1 {abv < 0 ? 'ring-2 ring-red-500' : ''}">
					{proof.toFixed(1)} proof
				</p>
			</div>
		{/if}
	</div>
</div>
