<script lang="ts">
	import {
		Mixture as MixtureObject,
		Sugar as SugarObject,
		Water as WaterObject,
		Spirit as SpiritObject,
		solve
	} from '../lib/solutions';
	import Spirit from './Spirit.svelte';
	import SpiritComponent from './Spirit.svelte';
	import SugarComponent from './Sugar.svelte';
	import WaterComponent from './Water.svelte';
	import debounce from 'lodash.debounce';

	let mxPojo: Record<
		string,
		| {
				type: 'spirit';
				volume: number;
				abv: number;
		  }
		| {
				type: 'water';
				volume: number;
		  }
		| {
				type: 'sugar';
				mass: number;
		  }
	> = {
		spirit: { volume: 100, abv: 40, type: 'spirit' },
		water: { volume: 100, type: 'water' },
		sugar: { mass: 50, type: 'sugar' }
	};

	function makeMixture() {
		const ingredients = Object.entries(mxPojo).map(([name, mx]) => {
			if (mx.type === 'spirit') return [name, new SpiritObject(mx.volume, mx.abv)];
			if (mx.type === 'water') return [name, new WaterObject(mx.volume)];
			if (mx.type === 'sugar') return [name, new SugarObject(mx.mass)];
			throw new Error('Unknown mixture type');
		});
		return new MixtureObject(Object.fromEntries(ingredients));
	}

	let analysis = makeMixture().analyze(1);

	function updateAnalysis() {
		analysis = makeMixture().analyze(1);
	};

	const updateFromIngredient = debounce((e) => {
		const updated = e.detail;
		const which = Object.entries(mxPojo).find(([name]) => name === updated.name);
		if (!which) return;
		const [, mx] = which;
		if (updated.volume && 'volume' in mx) mx.volume = updated.volume;
		if (updated.abv && 'abv' in mx) mx.abv = updated.abv;
		if (updated.mass && 'mass' in mx) mx.mass = updated.mass;

		updateAnalysis();
	}, 50);


	const handleVolumeInput = debounce((event: Event) => {
		if (!(event.target instanceof HTMLInputElement)) return;
		// Call your function here
		solveVolume(Number(event.target.value));
	}, 100);

	function solveVolume(newVolume: number) {
		if (newVolume < 1) return;
		const oldVolume = makeMixture().volume;
		if (newVolume === oldVolume) return;
		const delta = newVolume / oldVolume;
		for (const item of Object.values(mxPojo)) {
			if (item.type === 'sugar') {
				item.mass *= delta;
			} else {
				item.volume *= delta;
			}
		}

		// Trigger Svelte's reactivity by assigning a new object to `mxPojo`
		mxPojo = { ...mxPojo };
	}

	function solveABV() {
		const mx = makeMixture();
		const spirit = Object.values(mx.components).find(
			(mixture) => mixture instanceof Spirit
		) as SpiritObject;
		if (!spirit) return;
		// const sweetener = mixtures.find((mixture) => mixture instanceof SugarObject);

		solve(spirit, mx.abv, mx.brix);
		updateAnalysis();
	}

	let newName = '';
	let newVolume = 0;
	let newAbv = 0;
	let newBrix = 0;

	// function addMixture() {}

	// function removeMixture(index: number) {
	// 	mixtures = mixtures.filter((_, i) => i !== index);
	// }
</script>

<div class="mixture-list">
	{#each Object.entries(mxPojo) as [name, data], index (index)}
		<div class="mixture-item">
			{#if data.type === 'spirit'}
				<SpiritComponent {name} {...data} on:update={updateFromIngredient} />
			{:else if data.type === 'water'}
				<WaterComponent {name} {...data} on:update={updateFromIngredient} />
			{:else if data.type === 'sugar'}
				<SugarComponent {name} {...data} on:update={updateFromIngredient} />
			{/if}
			<!-- <button on:click={() => removeMixture(index)}>Remove</button> -->
		</div>
	{/each}

	<div class="mixture-state">
		<h2>Totals</h2>
		<p>Volume: {analysis.volume}ml</p>
		<div>
			<label for="mixture-volume">Volume:</label>
			<input
				id="mixture-volume"
				type="number"
				bind:value={analysis.volume}
				on:input={handleVolumeInput}
				class="w-20 rounded border px-2 py-1"
			/>
			ml
		</div>
		<p>ABV: {analysis.abv}%</p>
		<p>Brix: {analysis.brix}</p>
		<p>Mass: {analysis.mass}g</p>
	</div>

	<!-- <div class="add-mixture">
		<input bind:value={newName} placeholder="Name" />
		<input type="number" bind:value={newVolume} placeholder="Volume" />
		<input type="number" bind:value={newAbv} placeholder="ABV" />
		<input type="number" bind:value={newBrix} placeholder="Brix" />
		<button on:click={addMixture}>Add Mixture</button>
	</div> -->
</div>

<style>
	.mixture-item {
		margin-bottom: 1rem;
	}
</style>
