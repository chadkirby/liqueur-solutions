<script lang="ts">
	import { Syrup, type Component } from '../lib/solutions';
	import { onMount, createEventDispatcher } from 'svelte';
	let dispatcher = createEventDispatcher();

	export let name = 'syrup';
	export let brix: number = 50;
	export let volume: number = 100;
	let analysis: ReturnType<Component['analyze']>;

	onMount(() => {
		analysis = new Syrup(volume, brix).analyze(0);
	});

	const updateAnalysis = () => {
		analysis = new Syrup(volume, brix).analyze(0);
		dispatcher('update', { name, volume, brix });
	};
	$: {
		analysis = new Syrup(volume, brix).analyze(0);
	}
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
				class="w-20 rounded border px-2 py-1"
			/>
			ml
		</div>
	</div>
</div>
