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

<Volume {componentId} {component}  class="basis-1/4" />
<Mass {componentId} {component}  class="basis-1/4" />
<Brix {componentId} {component}  class="basis-1/4" />
<Cal {componentId} {component} />
