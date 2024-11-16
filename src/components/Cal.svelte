<script lang="ts">
	import type { AnyComponent } from '$lib';
	import NumberSpinner from './NumberSpinner.svelte';
	interface Props {
		componentId: string;
		component: AnyComponent;
	}

	let { componentId: storeId, component }: Props = $props();
</script>

<div class="mx-1 grow">
	<NumberSpinner
	{storeId}
	valueType="kcal"
	readonly={true}
	label="kcal"
	suffix="kcal"
	/>
</div>
