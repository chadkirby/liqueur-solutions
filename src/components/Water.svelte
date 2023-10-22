<script lang="ts">
	import { Water, type Component } from '../lib/index.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import MassComponent from './Mass.svelte';
	import ABVComponent from './ABV.svelte';
	import BrixComponent from './Brix.svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'water';
	export let volume: number = 100;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Water(volume).analyze(1);
	});

	const updateVolume = (event: CustomEvent) => {
		if (volume === event.detail) return;
    volume = event.detail;
		analysis = new Water(volume).analyze(1);
		dispatcher('update', {name, volume});
	};
	$: {
		analysis = new Water(volume).analyze(1);
	}
	</script>

<VolumeComponent {volume} onInput={updateVolume} />
<MassComponent mass={analysis.mass} onInput={null} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} onInput={null} />
