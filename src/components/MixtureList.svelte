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

	let analysis = makeMixture().analyze(0);

	function updateAnalysis() {
		analysis = makeMixture().analyze(0);
	}

	const updateFromIngredient = debounce((e) => {
		const updated = e.detail;
		const which = Object.entries(mxPojo).find(([name]) => name === updated.name);
		if (!which) return;
		const [, mx] = which;
		if (updated.volume && 'volume' in mx) mx.volume = updated.volume;
		if (updated.abv && 'abv' in mx) mx.abv = updated.abv;
		if (updated.mass && 'mass' in mx) mx.mass = updated.mass;
		if (updated.brix && 'brix' in mx) mx.brix = updated.brix;

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

	const handleAbvInput = debounce((event: Event) => {
		if (!(event.target instanceof HTMLInputElement)) return;
		// Call your function here
		solveAbv(Number(event.target.value));
	}, 100);

	function solveAbv(newAbv: number) {
		if (newAbv < 1) return;
		const mx = makeMixture();
		const oldAbv = mx.abv;
		if (newAbv === oldAbv) return;
		const spirit = Object.values(mx.components).find(
			(mixture) => mixture instanceof SpiritObject
		) as SpiritObject;
		if (!spirit) return;
		const solution = solve(spirit, newAbv, analysis.brix);
		for (const item of Object.values(mxPojo)) {
			if (item.type === 'sugar') {
				item.mass = Math.round(solution.mixture.components.sugar.mass);
			} else if (item.type === 'spirit') {
				item.volume = solution.mixture.components.spirit.volume;
			} else {
				item.volume = solution.mixture.components.water.volume;
			}
		}

		// Trigger Svelte's reactivity by assigning a new object to `mxPojo`
		mxPojo = { ...mxPojo };
		updateAnalysis();
	}

	const handleBrixInput = debounce((event: Event) => {
		if (!(event.target instanceof HTMLInputElement)) return;
		// Call your function here
		solveBrix(Number(event.target.value));
	}, 100);

	function solveBrix(newBrix: number) {
		if (newBrix < 0) return;
		const mx = makeMixture();
		const oldBrix = mx.brix;
		if (newBrix === oldBrix) return;
		const spirit = Object.values(mx.components).find(
			(mixture) => mixture instanceof SpiritObject
		) as SpiritObject;
		if (!spirit) return;
		const solution = solve(spirit, analysis.abv, newBrix);
		for (const item of Object.values(mxPojo)) {
			if (item.type === 'sugar') {
				item.mass = Math.round(solution.mixture.components.sugar.mass);
			} else if (item.type === 'spirit') {
				item.volume = solution.mixture.components.spirit.volume;
			} else {
				item.volume = solution.mixture.components.water.volume;
			}
		}

		// Trigger Svelte's reactivity by assigning a new object to `mxPojo`
		mxPojo = { ...mxPojo };
		updateAnalysis();
	}

	let newName = '';
	let newVolume = 0;
	let newAbv = 0;
	let newBrix = 0;

	function decimalToFraction(decimal: number): string {
		const wholePart = Math.floor(decimal);
		const fractionalPart = decimal - wholePart;
		const fractionDenominator = 16;
		const closestNumerator = Math.round(fractionalPart * fractionDenominator);
		const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
		const divisor = gcd(closestNumerator, fractionDenominator);
		const numerator = closestNumerator / divisor;
		const denominator = fractionDenominator / divisor;

		const frac = (numerator === 0 || numerator === 16) ? '' : `${numerator}⁄${denominator}`;

		if (wholePart === 0 && frac === '') {
			return '0';
		} else if (numerator === denominator) {
			return `${wholePart + 1}`;
		} else if (wholePart === 0) {
			return `${frac}`;
		} else if (frac === '') {
			return `${wholePart}`;
		} else {
			return `${wholePart} ${frac}`;
		}
	}

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
		<div class="flex items-center justify-start space-x-4">
			<div>
				<label for="mixture-abv">ABV:</label>
				<input
					id="mixture-abv"
					type="number"
					bind:value={analysis.abv}
					on:input={handleAbvInput}
					class="w-20 rounded border px-2 py-1"
				/>
				%
			</div>
			<p>Proof: {2 * analysis.abv}</p>
		</div>
		<div class="flex items-center justify-start space-x-4">
			<div>
				<label for="mixture-brix">Brix:</label>
				<input
					id="mixture-brix"
					type="number"
					bind:value={analysis.brix}
					on:input={handleBrixInput}
					class="w-20 rounded border px-2 py-1"
				/>
				% sugar by weight
			</div>
		</div>
		<div class="flex items-center justify-start space-x-4">
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
			<p>{(analysis.volume * 0.033814).toFixed(1)} fl oz</p>
			<p>{decimalToFraction((analysis.volume * 0.033814) / 8)} cups</p>
		</div>
		<div class="flex items-center justify-start space-x-4">
			<p>Mass: {analysis.mass}g</p>
		</div>
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
