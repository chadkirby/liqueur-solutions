<script lang="ts">
	import { Spirit } from '../lib/index.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	import BrixComponent from './Brix.svelte';
	let dispatcher = createEventDispatcher();

	type Locked = Spirit['locked'];

	export let name = 'spirit';
	export let volume: number = 100;
	export let abv: number = 40;
	export let locked: Locked = 'none';
	let analysis: ReturnType<Spirit['analyze']>;

	onMount(() => {
		analysis = new Spirit(volume, abv, locked).analyze(1);
	});

	const updateVolume = (event: CustomEvent) => {
		if (event.type === 'lock') {
			const volumeLock = event.detail.isLocked ? 'volume' as Locked : '';
			const abvLock = /abv/.test(locked) ? 'abv' as Locked : '';
			locked = ([volumeLock, abvLock].filter(Boolean).join('+') || 'none') as Locked;
			dispatcher('update', {name, volume, locked});
			return;
		}
		if (volume === event.detail) return;
		volume = event.detail;
		analysis = new Spirit(volume, abv, locked).analyze(1);
		dispatcher('update', { name, volume, abv, locked });
	};

	const updateAbv = (event: CustomEvent) => {
		if (event.type === 'lock') {
			const volumeLock = /volume/.test(locked) ? 'volume' as Locked : '';
			const abvLock = event.detail.isLocked ? 'abv' as Locked : '';
			locked = ([volumeLock, abvLock].filter(Boolean).join('+') || 'none') as Locked;
			dispatcher('update', {name, volume, locked});
			return;
		}
		if (abv === event.detail) return;
		abv = event.detail;
		analysis = new Spirit(volume, abv, locked).analyze(1);
		dispatcher('update', { name, volume, abv });
	};

	$: {
		analysis = new Spirit(volume, abv, locked).analyze(1);
	}
</script>

<VolumeComponent {volume} isLocked={/volume/.test(locked)} onInput={updateVolume} />
<MassComponent mass={analysis.mass} onInput={null} />
<ABVComponent abv={analysis.abv} isLocked={/abv/.test(locked)} onInput={updateAbv} />
<BrixComponent brix={analysis.brix} onInput={null} />
