<script lang="ts">
	import { Syrup, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'syrup';
	export let volume: number = 100;
  export let brix: number = 50;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Syrup(brix, volume).analyze(0);
	});

	const updateAnalysis = () => {
		analysis = new Syrup(brix, volume).analyze(0);
		dispatcher('update', {name, volume});
	};
	$: {
		analysis = new Syrup(brix, volume).analyze(0);
	}
	</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
    <!-- show/update Volume -->
		<div>
			<label for="volume">Volume:</label>
			<input id="volume" type="number" bind:value={volume} on:input={updateAnalysis} class="border px-2 py-1 rounded w-20">
		</div>
			<!-- show/update Brix -->
    <div>
      <label for="brix">Brix:</label>
      <input id="brix" type="number" bind:value={brix} on:input={updateAnalysis} class="border px-2 py-1 rounded w-20">
    </div>

	</div>
	<div>
		<p>Volume: {analysis?.volume}</p>
		<p>Brix: {analysis?.brix}</p>
	</div>
</div>
