<script lang="ts">
	import { Sugar, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'sugar';
	export let mixture: Component = new Sugar(100);
	export let mass: number = mixture.mass;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = mixture.analyze(0);
	});

	const updateAnalysis = () => {
		mixture.mass = mass;
		analysis = mixture.analyze(0);
		dispatcher('update', analysis);
	};
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
    <!-- show/update Volume -->
		<div>
			<label for="mass">Mass:</label>
			<input id="mass" type="number" bind:value={mass} on:input={updateAnalysis} class="border px-2 py-1 rounded w-20">
			grams
		</div>
		<p>Volume: {analysis?.volume}ml</p>

	</div>
</div>
