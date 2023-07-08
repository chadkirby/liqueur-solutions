<script lang="ts">
	import { Sugar, type Component } from '../lib/index.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import MassComponent from './Mass.svelte'
	import VolumeComponent from './Volume.svelte'
	import Mass from './Mass.svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'sugar';
	export let mass: number = 50;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Sugar(mass).analyze(0);
	});

	const updateAnalysis = (event: CustomEvent) => {
		if (mass === event.detail) return;
    mass = event.detail;
		analysis = new Sugar(mass).analyze(0);
		dispatcher('update', {name, mass});
	};
	$: {
		analysis = new Sugar(mass).analyze(0);
	}
</script>


<MassComponent mass={analysis.mass} onInput={updateAnalysis} />
<VolumeComponent volume={analysis.volume} onInput={null} />
