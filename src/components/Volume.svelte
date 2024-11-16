<script lang="ts">
	import { Sweetener, type AnyComponent } from '$lib';
	import NumberSpinner from './NumberSpinner.svelte';

	interface Props {
		componentId: string; // let flOz: number;
		component: AnyComponent;
	}

	let { componentId: storeId, component }: Props = $props();

	// let cups: number;
	// $: flOz = volume * 0.033814;
	// $: cups = flOz / 8;
</script>

<div class="mx-1 grow">
	<NumberSpinner
	label="Volume"
	suffix="ml"
	{storeId}
	readonly={component instanceof Sweetener}
	valueType="volume"
	/>
</div>
