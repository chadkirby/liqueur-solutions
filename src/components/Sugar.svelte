<script lang="ts">
	import { Sugar, type Component } from '../lib/index.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import MassComponent from './Mass.svelte';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import BrixComponent from './Brix.svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'sugar';
	export let mass: number = 50;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Sugar(mass).analyze(1);
	});

	const updateMass = (event: CustomEvent) => {
		if (mass === event.detail) return;
		mass = event.detail;
		analysis = new Sugar(mass).analyze(1);
		dispatcher('update', { name, mass });
	};
	$: {
		analysis = new Sugar(mass).analyze(1);
	}
</script>

<VolumeComponent volume={analysis.volume} onInput={null} />
<MassComponent mass={analysis.mass} onInput={updateMass} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} onInput={null} />
