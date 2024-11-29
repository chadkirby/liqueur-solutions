<script lang="ts">

	import { type Water } from '$lib';
	import Mass from './Mass.svelte';
	import Volume from './Volume.svelte';
	interface Props {
		componentId: string;
		component: Water
	}

	let { componentId, component }: Props = $props();

</script>

<Volume {componentId} {component} readonly={true}  class="basis-1/2" />
<Mass {componentId} {component} readonly={true}  class="basis-1/2" />
