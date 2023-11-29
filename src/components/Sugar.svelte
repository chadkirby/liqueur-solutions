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
	export let locked: Sugar['locked'] = 'none';
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Sugar(mass, locked).analyze(1);
	});

	const updateMass = (event: CustomEvent) => {		if (event.type === 'lock') {
		locked = event.detail.isLocked ? 'mass' : 'none';
			dispatcher('update', {name, mass, locked});
			return;
		}

		if (mass === event.detail) return;
		mass = event.detail;
		analysis = new Sugar(mass, locked).analyze(1);
		dispatcher('update', { name, mass, locked });
	};
	$: {
		analysis = new Sugar(mass, locked).analyze(1);
	}
</script>

<VolumeComponent volume={analysis.volume} onInput={null} />
<MassComponent mass={analysis.mass} isLocked={locked !== 'none'} onInput={updateMass} />
<ABVComponent abv={analysis.abv} onInput={null} />
<BrixComponent brix={analysis.brix} onInput={null} />
