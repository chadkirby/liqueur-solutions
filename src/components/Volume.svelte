<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';

	interface Props {
		storeId: string; // let flOz: number;
	}

	let { storeId }: Props = $props();
	
	// let cups: number;
	// $: flOz = volume * 0.033814;
	// $: cups = flOz / 8;
</script>

<div class="mx-1 grow">
	<NumberSpinner
	label="Volume"
	suffix="ml"
	{storeId}
	readonly={/sugar/.test(storeId)}
	valueType="volume"
	/>
</div>
