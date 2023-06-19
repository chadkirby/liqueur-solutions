<script lang="ts">
	import { Spirit } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'spirit';
	export let mixture = new Spirit(100, 40);
	export let volume: number = mixture.volume;
	export let abv: number = mixture.abv;
	let analysis: ReturnType<Spirit['analyze']>;

	onMount(() => {
		analysis = mixture.analyze(0);
	});

	const updateAnalysis = () => {
		mixture.volume = volume;
		mixture.abv = abv;
		analysis = mixture.analyze(0);
		dispatcher('update', analysis);
	};
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
		<!-- show/update Volume -->
		<div>
			<label for="spirit-volume">Volume:</label>
			<input
				id="spirit-volume"
				type="number"
				bind:value={volume}
				on:input={updateAnalysis}
				class="rounded border px-2 py-1 w-20"
			/>
			ml
		</div>
		<!-- show/update ABV -->
		<div>
			<label for="abv">ABV:</label>
			<input
				id="abv"
				type="number"
				bind:value={abv}
				on:input={updateAnalysis}
				class="rounded border px-2 py-1 w-20"
			/>
			%
		</div>
		<p>Mass: {analysis?.mass}g</p>
	</div>
</div>
