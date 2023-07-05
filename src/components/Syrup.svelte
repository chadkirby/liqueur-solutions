<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import BrixComponent from './Brix.svelte';

	let dispatcher = createEventDispatcher();

	export let name = 'syrup';
	export let brix: number = 50;
	export let volume: number = 100;

	const updateVolume = (event: Event) => {
		const target = event.target as HTMLInputElement;
		volume = parseFloat(target.value);
		dispatcher('update', { name, volume, brix });
	};
	const updateBrix = (event: Event) => {
		const target = event.target as HTMLInputElement;
		brix = parseFloat(target.value);
		dispatcher('update', { name, volume, brix });
	};
</script>

<VolumeComponent {volume} onInput={updateVolume} />
<BrixComponent {brix} onInput={updateBrix} />
