<script lang="ts">
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import IconButton from '@smui/icon-button';
	import { computeSg } from '$lib/utils.js';
	export let onInput: null | ((event: Event) => void);
	export let brix: number = 40;
	let showDetails = false;
	let gravity: number;
	$: gravity = computeSg(brix);
</script>

<div class="flex items-center justify-start space-x-3">
	<IconButton class="material-icons" on:click={() => (showDetails = !showDetails)}
		>{showDetails ? 'arrow_drop_down' : 'arrow_right'}</IconButton
	>
	<div>
		<Textfield
			class="w-20"
			bind:value={brix}
			label="ºBrix"
			type="number"
			on:input={onInput ? onInput : () => {}}
			suffix="%"
			disabled={onInput === null}
			invalid={brix < 0}
		>
			<HelperText persistent slot="helper">Sugar by weight</HelperText>
		</Textfield>
		{#if showDetails}
			<div class="mt-2 flex justify-between">
				<span class="px-2 py-1">specific gravity:</span>
				<span class="rounded border px-2 py-1 {brix < 0 ? 'ring-2 ring-red-500' : ''}">
					{gravity.toFixed(2)}
				</span>
			</div>
		{/if}
	</div>
</div>
