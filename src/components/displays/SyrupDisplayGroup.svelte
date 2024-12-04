<script lang="ts">
	import { type Mixture } from '$lib';
	import Mass from './Mass.svelte';
	import Volume from './Volume.svelte';
	import Cal from './Cal.svelte';
	import Brix from './Brix.svelte';
	interface Props {
		componentId: string;
		component: Mixture;
	}

	let { componentId, component }: Props = $props();
</script>

<div class="flex flex-row my-1">
	<Volume {componentId} {component} readonly={true} class="basis-1/4" />
	<Mass {componentId} {component} readonly={true} class="basis-1/4" />
	<Brix {componentId} {component} readonly={true} class="basis-1/4" />
	<Cal {componentId} {component} readonly={true} />
</div>
