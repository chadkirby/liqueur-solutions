<script lang="ts">
	import { Spirit } from '../lib/index.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'spirit';
	export let volume: number = 100;
	export let abv: number = 40;
	let analysis: ReturnType<Spirit['analyze']>;

	onMount(() => {
		analysis = new Spirit(volume, abv).analyze(0);
	});

	const updateVolume = (event: CustomEvent) => {
		if (volume === event.detail) return;
		volume = event.detail;
		analysis = new Spirit(volume, abv).analyze(0);
		dispatcher('update', { name, volume, abv });
	};

	const updateAbv = (event: CustomEvent) => {
		if (abv === event.detail) return;
		abv = event.detail;
		analysis = new Spirit(volume, abv).analyze(0);
		dispatcher('update', { name, volume, abv });
	};

	$: {
		analysis = new Spirit(volume, abv).analyze(0);
	}
</script>

<VolumeComponent {volume} onInput={updateVolume} />
<ABVComponent {abv} onInput={updateAbv} />
<!-- <MassComponent mass={analysis.mass} onInput={null} /> -->
