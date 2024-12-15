<script lang="ts">
	import { type Sweetener } from '$lib/index.svelte';
	import Mass from './Mass.svelte';
	import Volume from './Volume.svelte';
	import Cal from './Cal.svelte';
	import EquivalentSugar from './EquivalentSugar.svelte';
	interface Props {
		componentId: string;
		component: Sweetener;
	}

	let { componentId, component }: Props = $props();
</script>

<div class="flex flex-row my-1">
	<Mass {componentId} {component} readonly={true} class="basis-1/4" />
	<Volume {componentId} {component} readonly={true} class="basis-1/5" />
	<EquivalentSugar {componentId} {component} readonly={true} class="basis-1/5" />
	<Cal {componentId} {component} readonly={true} class="basis-1/5" />
</div>
