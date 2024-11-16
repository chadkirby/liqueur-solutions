<script lang="ts">

	import NumberSpinner from './NumberSpinner.svelte';
	import { Sweetener, type AnyComponent } from '$lib';
	interface Props {
		componentId: string;
		component: AnyComponent
	}

	let { componentId: storeId, component }: Props = $props();

	let decimals = $derived(component.mass > 10 ? 0 : component.mass > 1 ? 1 : 2);

</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="Mass"
		suffix="g"
		{storeId}
		valueType="mass"
		readonly={!(component instanceof Sweetener)}
		decimals={decimals}
		/>
</div>
