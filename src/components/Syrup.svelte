<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import BrixComponent from './Brix.svelte';

	let dispatcher = createEventDispatcher();

	export let name = 'syrup';
	export let brix: number = 50;
	export let volume: number = 100;

	const updateVolume = (event: CustomEvent) => {
		if (volume === event.detail) return;
		volume = event.detail;
		dispatcher('update', { name, volume, brix });
	};
	const updateBrix = (event: CustomEvent) => {
		if (brix === event.detail) return;
		brix = event.detail;
		dispatcher('update', { name, volume, brix });
	};
</script>

<VolumeComponent {volume} onInput={updateVolume} />
<BrixComponent {brix} onInput={updateBrix} />
