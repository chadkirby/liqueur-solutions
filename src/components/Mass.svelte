<script lang="ts">
	import Textfield from '@smui/textfield';
	import IconButton from '@smui/icon-button';
	export let onInput: null | ((event: Event) => void);

	export let mass: number = 100; // grams
	let showDetails = false;
	let ounces: number;
	let rounded: number;
	$: rounded = Math.round(mass);
	$: ounces = mass * 0.035274;
</script>

<div class="flex items-center justify-start space-x-3">
	<IconButton class="material-icons" size="mini" on:click={() => (showDetails = !showDetails)}
		>{showDetails ? 'arrow_drop_down' : 'arrow_right'}</IconButton
	>
	<div>
		<Textfield
			class="w-20"
			bind:value={rounded}
			label="Mass"
			type="number"
			on:input={onInput ? onInput : () => {}}
			suffix="g"
			invalid={mass < 0}
			disabled={onInput === null}
		/>
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<p class="rounded border px-2 py-1 {mass < 0 ? 'ring-2 ring-red-500' : ''}">
					{ounces.toFixed(1)} oz
				</p>
			</div>
		{/if}
	</div>
</div>
