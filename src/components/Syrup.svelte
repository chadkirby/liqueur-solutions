<script lang="ts">
	import { Syrup, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'spirit';
	export let mixture: Component = new Syrup(50, 100);
	export let volume: number = mixture.volume;
	export let abv: number = mixture.abv;
  export let brix: number = mixture.brix;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = mixture.analyze(0);
	});

	const updateAnalysis = () => {
		mixture.volume = volume;
    mixture.brix = brix;
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
		</div>
		<p>ABV: {mixture.abv}</p>
			<!-- show/update Brix -->
    <div>
      <label for="brix">Brix:</label>
      <input id="brix" type="number" bind:value={abv} on:input={updateAnalysis} class="border px-2 py-1 rounded w-20">
    </div>

	</div>
	<div>
		<p>Volume: {analysis?.volume}</p>
		<p>ABV: {analysis?.abv}</p>
		<p>Brix: {analysis?.brix}</p>
	</div>
</div>
