<script lang="ts">

	import { type Mixture } from '$lib';
	import Mass from './Mass.svelte';
	import Volume from './Volume.svelte';
	import Cal from './Cal.svelte';
	import Brix from './Brix.svelte';
	interface Props {
		componentId: string;
		component: Mixture
	}

	let { componentId, component }: Props = $props();

</script>

<Volume {componentId} {component} />
<Mass {componentId} {component} />
<Brix {componentId} {component} />
<Cal {componentId} {component} />
