<script lang="ts">
	import { Water, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	import VolumeComponent from './Volume.svelte';
	import MassComponent from './Mass.svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'water';
	export let volume: number = 100;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Water(volume).analyze(0);
	});

	const updateVolume = (event: Event) => {
		const target = event.target as HTMLInputElement;
    volume = parseFloat(target.value);

		analysis = new Water(volume).analyze(0);
		dispatcher('update', {name, volume});
	};
	$: {
		analysis = new Water(volume).analyze(0);
	}
	</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<VolumeComponent id="{name}-volume" {volume} onInput={updateVolume} />
	<MassComponent id="{name}-mass" mass={analysis.mass} onInput={null} />
</div>
