<script lang="ts">
	import { Sugar, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'sugar';
	export let mass: number = 50;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Sugar(mass).analyze(0);
	});

	const updateAnalysis = () => {
		analysis = new Sugar(mass).analyze(0);
		dispatcher('update', {name, mass});
	};
	$: {
		analysis = new Sugar(mass).analyze(0);
	}
</script>

<div class="mixture flex items-center justify-start space-x-5">
	<h2 class="text-xl font-bold">{name}</h2>
	<div class="flex items-center space-x-4">
		<!-- show/update Volume -->
		<div>
			<label for="mass">Mass:</label>
			<input
				id="mass"
				type="number"
				bind:value={mass}
				on:input={updateAnalysis}
				class="w-20 rounded border px-2 py-1"
			/>
			grams
		</div>
		<p>Volume: {analysis?.volume}ml</p>
	</div>
</div>
