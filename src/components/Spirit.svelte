<script lang="ts">
	import { Spirit } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'spirit';
	export let volume: number = 100;
	export let abv: number = 40;
	let analysis: ReturnType<Spirit['analyze']>;

	onMount(() => {
		analysis = new Spirit(volume, abv).analyze(0);
	});

	const updateAnalysis = () => {
		analysis = new Spirit(volume, abv).analyze(0);
		dispatcher('update', {name, volume, abv});
	};

	$: {
		analysis = new Spirit(volume, abv).analyze(0);
	}
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
				class="w-20 rounded border px-2 py-1"
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
				class="w-20 rounded border px-2 py-1"
			/>
			%
		</div>
		<p>Mass: {analysis?.mass}g</p>
	</div>
</div>
