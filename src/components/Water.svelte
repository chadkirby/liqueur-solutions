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
	export let locked: Water['locked'] = 'none';
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Water(volume, locked).analyze(1);
	});

	const updateVolume = (event: CustomEvent) => {
		if (event.type === 'lock') {
			locked = event.detail.isLocked ? 'volume' : 'none';
			dispatcher('update', {name, volume, locked});
			return;
		}
		if (volume === event.detail) return;
    volume = event.detail;
		analysis = new Water(volume, locked).analyze(1);
		dispatcher('update', {name, volume, locked});
	};
	$: {
		analysis = new Water(volume, locked).analyze(1);
	}
	</script>

<VolumeComponent {volume} isLocked={locked !== 'none'} onInput={updateVolume} />
<MassComponent mass={analysis.mass} onInput={null} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} onInput={null} />
