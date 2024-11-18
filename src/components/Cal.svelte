<script lang="ts">
	import type { AnyComponent } from '$lib';
	import { roundForDisplay } from '$lib/utils.js';
	import { Helper, Label } from 'svelte-5-ui-lib';
	import NumberSpinner from './NumberSpinner.svelte';
	import ReadOnlyValue from './ReadOnlyValue.svelte';
	interface Props {
		componentId: string;
		component: AnyComponent;
	}

	let { componentId: storeId, component }: Props = $props();
	let value = $derived(component.kcal);
</script>

<div class="mx-1 grow">
	<Helper>kcal</Helper>
	<ReadOnlyValue>{roundForDisplay(value)}</ReadOnlyValue>
</div>
