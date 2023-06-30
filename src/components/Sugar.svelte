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

	const updateAnalysis = (event: Event) => {
		const target = event.target as HTMLInputElement;
    mass = parseFloat(target.value);
		analysis = new Sugar(mass).analyze(0);
		dispatcher('update', {name, mass});
	};
	$: {
		analysis = new Sugar(mass).analyze(0);
	}
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<MassComponent mass={analysis.mass} onInput={updateAnalysis} />
	<VolumeComponent volume={analysis.volume} onInput={null} />
</div>
