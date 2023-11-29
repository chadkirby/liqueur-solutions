<script lang="ts">
	import { Spirit, type Component } from '../lib/index.js';
	import { onMount } from 'svelte';

	export let name = 'spirit';
	export let mixture: Component = new Spirit(100, 40, 'none');
	export let volume: number = mixture.volume;
	export let abv: number = mixture.abv;
	export let brix: number = mixture.brix;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = mixture.analyze(1);
	});

	const updateAnalysis = () => {
		mixture.volume = volume;
		mixture.abv = abv;
		mixture.brix = brix;
		analysis = mixture.analyze(1);
	};
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
		<!-- show/update Volume -->
		<div>
			<label for="volume">Volume:</label>
			<input
				id="volume"
				type="number"
				bind:value={volume}
				on:input={updateAnalysis}
				class="w-24 rounded border px-2 py-1"
			/>
		</div>
		<!-- show/update ABV -->
		<div>
			<label for="abv">ABV:</label>
			<input
				id="abv"
				type="number"
				bind:value={abv}
				on:input={updateAnalysis}
				class="w-24 rounded border px-2 py-1"
			/>
		</div>
		<!-- show/update Brix -->
		<div>
			<label for="brix">Brix:</label>
			<input
				id="brix"
				type="number"
				bind:value={abv}
				on:input={updateAnalysis}
				class="w-24 rounded border px-2 py-1"
			/>
		</div>
	</div>
	<div>
		<p>Volume: {analysis?.volume}</p>
		<p>ABV: {analysis?.abv}</p>
		<p>Brix: {analysis?.brix}</p>
	</div>
</div>
