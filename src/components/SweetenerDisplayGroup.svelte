<script lang="ts">

	import { type Sweetener } from '$lib';
	import Mass from './Mass.svelte';
	import Volume from './Volume.svelte';
	import Cal from './Cal.svelte';
	import EquivalentSugar from './EquivalentSugar.svelte';
	interface Props {
		componentId: string;
		component: Sweetener
	}

	let { componentId, component }: Props = $props();

</script>

<Mass {componentId} {component} />
<Volume {componentId} {component} />
<EquivalentSugar {component} />
<Cal {componentId} {component} />
