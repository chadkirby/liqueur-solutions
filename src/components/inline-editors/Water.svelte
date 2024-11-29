<script lang="ts">
	import NumberSpinner from '../NumberSpinner.svelte';
	import { mixtureStore, Water } from '$lib';
	import { Helper } from 'svelte-5-ui-lib';
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';

	interface Props {
		componentId: string;
		component: Water;
	}
	let { componentId, component }: Props = $props();

	let ml = $derived(component.volume);
</script>

<div class="mx-1 w-full">
	<div class="w-1/5">
		<Helper>Volume</Helper>
		<NumberSpinner
			value={ml}
			format={(v) => `${format(v, { unit: 'ml' })}`}
			onValueChange={(v) => mixtureStore.setVolume(componentId, v)}
		/>
	</div>

	<div class="w-4/5">
		<ReadOnlyValue>Water</ReadOnlyValue>
	</div>
</div>
