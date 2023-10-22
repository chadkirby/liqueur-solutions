<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Syrup } from '../lib/index.js';
	import VolumeComponent from './Volume.svelte';
	import BrixComponent from './Brix.svelte';
	import MassComponent from './Mass.svelte';
	import ABVComponent from './ABV.svelte';

	let dispatcher = createEventDispatcher();

	export let name = 'syrup';
	export let brix: number = 50;
	export let volume: number = 100;
	let analysis: ReturnType<Syrup['analyze']>;

	onMount(() => {
		analysis = new Syrup(volume, brix).analyze(1);
	});

	const updateVolume = (event: CustomEvent) => {
		if (volume === event.detail) return;
		volume = event.detail;
		analysis = new Syrup(volume, brix).analyze(1);
		dispatcher('update', { name, volume, brix });
	};
	const updateBrix = (event: CustomEvent) => {
		if (brix === event.detail) return;
		brix = event.detail;
		analysis = new Syrup(volume, brix).analyze(1);
		dispatcher('update', { name, volume, brix });
	};
	$: {
		analysis = new Syrup(volume, brix).analyze(1);
	}
</script>

<VolumeComponent volume={analysis.volume} onInput={updateVolume} />
<MassComponent mass={analysis.mass} onInput={null} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} onInput={updateBrix} />
