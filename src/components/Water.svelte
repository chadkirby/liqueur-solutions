<script lang="ts">
	import { Water, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'sugar';
	export let mixture: Component = new Water(100);
	export let volume: number = mixture.volume;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = mixture.analyze(0);
	});

	const updateAnalysis = () => {
		mixture.volume = volume;
		analysis = mixture.analyze(0);
		dispatcher('update', analysis);
	};
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
    <!-- show/update Volume -->
		<div>
			<label for="volume">Volume:</label>
			<input id="volume" type="number" bind:value={volume} on:input={updateAnalysis} class="border px-2 py-1 rounded w-20">
			ml
		</div>
		<p>Mass: {analysis?.mass}g</p>

	</div>
</div>
