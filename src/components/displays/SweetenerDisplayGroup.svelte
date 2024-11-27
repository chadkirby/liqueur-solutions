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

<Mass {componentId} {component} class="basis-1/4" />
<Volume {componentId} {component} class="basis-1/5" />
<EquivalentSugar {componentId} {component} class="basis-1/5"/>
<Cal {componentId} {component} class="basis-1/5" />
