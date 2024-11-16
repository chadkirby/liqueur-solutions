<script lang="ts">

	import NumberSpinner from './NumberSpinner.svelte';
	import { mixtureStore, type AnyComponent } from '$lib';
	interface Props {
		componentId: string;
		component: AnyComponent
	}

	let { componentId: storeId, component }: Props = $props();

	let readonly = $derived(!component.canEdit('abv'));
</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="ABV"
		suffix="%"
		{storeId}
		readonly={readonly}
		valueType="abv"
		max={100}
		keyStep={1}
		keyStepFast={10}
		keyStepSlow={0.1}
	/>
</div>
