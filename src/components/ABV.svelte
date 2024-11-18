<script lang="ts">

	import NumberSpinner from './NumberSpinner.svelte';
	import { Mixture, mixtureStore, type AnyComponent } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { roundForDisplay } from '$lib/utils.js';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	interface Props {
		componentId: string;
		component: AnyComponent
	}

	let { component, componentId }: Props = $props();

	let abv = $derived(component.abv);
	let proof = $derived(abv * 2);
</script>

<div class="mx-1 grow">
	<Helper>ABV</Helper>
	{#if component instanceof Mixture && component.canEdit('abv')}
		<NumberSpinner
			value={abv}
			format={v => `${roundForDisplay(v)}%`}
			onValueChange={v => mixtureStore.setAbv(componentId, v)}
			max={100}
		/>
	{:else}
		<ReadOnlyValue>{roundForDisplay(abv)}%</ReadOnlyValue>
	{/if}
	<Helper class="text-right mr-6">{roundForDisplay(proof, 'thin')}proof</Helper>
</div>
