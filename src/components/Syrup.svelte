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
	export let locked: Syrup['locked'] = 'none';
	let analysis: ReturnType<Syrup['analyze']>;

	onMount(() => {
		analysis = new Syrup(volume, brix, locked).analyze(1);
	});

	const updateVolume = (event: CustomEvent) => {
		if (event.type === 'lock') {
			const volumeLock = event.detail.isLocked ? 'volume' : '';
			const brixLock = /brix/.test(locked) ? 'brix' : '';
			locked = ([volumeLock, brixLock].filter(Boolean).join('+') || 'none') as Syrup['locked'];
			dispatcher('update', {name, volume, locked});
			return;
		}

		if (volume === event.detail) return;
		volume = event.detail;
		analysis = new Syrup(volume, brix, locked).analyze(1);
		dispatcher('update', { name, volume, brix, locked });
	};

	const updateBrix = (event: CustomEvent) => {
		if (event.type === 'lock') {
			const volumeLock = /volume/.test(locked) ? 'volume' : '';
			const brixLock = event.detail.isLocked ? 'brix' : '';
			locked = ([volumeLock, brixLock].filter(Boolean).join('+') || 'none') as Syrup['locked'];
			dispatcher('update', {name, volume, locked});
			return;
		}

		if (brix === event.detail) return;
		brix = event.detail;
		analysis = new Syrup(volume, brix, locked).analyze(1);
		dispatcher('update', { name, volume, brix, locked });
	};
	$: {
		analysis = new Syrup(volume, brix, locked).analyze(1);
	}
</script>

<VolumeComponent volume={analysis.volume} isLocked={/volume/.test(locked)} onInput={updateVolume} />
<MassComponent mass={analysis.mass} onInput={null} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} isLocked={/brix/.test(locked)} onInput={updateBrix} />
