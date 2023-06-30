<script lang="ts">
	import Fab, { Icon, Label } from '@smui/fab';
	import { goto } from '$app/navigation';
	import {
		Mixture as MixtureObject,
		Sugar as SugarObject,
		Water as WaterObject,
		Spirit as SpiritObject,
		Syrup as SyrupObject,
		solve,
		isSugar,
		isSyrup,
		isSpirit,
		isWater
	} from '$lib';
	import SpiritComponent from '../../components/Spirit.svelte';
	import SugarComponent from '../../components/Sugar.svelte';
	import WaterComponent from '../../components/Water.svelte';
	import SyrupComponent from '../../components/Syrup.svelte';
	import VolumeComponent from '../../components/Volume.svelte';
	import ABVComponent from '../../components/ABV.svelte';
	import MassComponent from '../../components/Mass.svelte';
	import BrixComponent from '../../components/Brix.svelte';
	import debounce from 'lodash.debounce';
	import type { PageData } from './$types.js';

	export let data: PageData;

	function makeMixture() {
		const ingredients = Object.entries(data || {}).map(([name, mx]) => {
			if (isSpirit(mx)) return [name, new SpiritObject(mx.volume, mx.abv)];
			if (isWater(mx)) return [name, new WaterObject(mx.volume)];
			if (isSugar(mx)) return [name, new SugarObject(mx.mass)];
			if (isSyrup(mx)) return [name, new SyrupObject(mx.volume, mx.brix)];
			throw new Error('Unknown mixture type');
		});
		return new MixtureObject(Object.fromEntries(ingredients));
	}

	let analysis = makeMixture().analyze(0);

	function updateAnalysis() {
		const mixture = makeMixture();
		analysis = mixture.analyze(0);
		goto(`/mixtures?${mixture.serialize()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	const updateFromIngredient = debounce((e) => {
		const updated = e.detail;
		const which = Object.entries(data).find(([name]) => name === updated.name);
		if (!which) return;
		const [, mx] = which;
		if (updated.volume && mx && 'volume' in mx) mx.volume = updated.volume;
		if (updated.abv && mx && 'abv' in mx) mx.abv = updated.abv;
		if (updated.mass && mx && 'mass' in mx) mx.mass = updated.mass;
		if (updated.brix && mx && 'brix' in mx) mx.brix = updated.brix;

		updateAnalysis();
	}, 100);

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
		for (const item of Object.values(data)) {
			if (isSugar(item)) {
				item.mass *= delta;
			} else if (isSpirit(item) || isWater(item)) {
				item.volume *= delta;
			}
		}

		updateAnalysis();
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
		const items = [...Object.values(data)];
		const sugarItems = items.filter((x) => isSugar(x) || isSyrup(x));
		const alcItems = items.filter((x) => isSpirit(x));
		const waterItems = items.filter((x) => isWater(x));
		for (const item of Object.values(data)) {
			if (isSugar(item)) {
				item.mass = Math.round(solution.mixture.components.sugar.mass);
			} else if (isSpirit(item)) {
				item.volume = solution.mixture.components.spirit.volume;
			} else if (isWater(item)) {
				item.volume = solution.mixture.components.water.volume;
			}
		}

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
		for (const item of Object.values(data)) {
			if (isSugar(item)) {
				item.mass = Math.round(solution.mixture.components.sugar.mass);
			} else if (isSpirit(item)) {
				item.volume = solution.mixture.components.spirit.volume;
			} else if (isWater(item)) {
				item.volume = solution.mixture.components.water.volume;
			}
		}

		updateAnalysis();
	}

	function addSpirit() {
		addObj(new SpiritObject(100, 40));
	}
	function addWater() {
		addObj(new WaterObject(100));
	}
	function addSugar() {
		addObj(new SugarObject(100));
	}
	function addSyrup() {
		addObj(new SyrupObject(100, 50));
	}
	function addObj(obj: SpiritObject | WaterObject | SugarObject | SyrupObject) {
		let key = obj.type;
		let i = 1;
		while (data[key]) {
			key = `${obj.type}-${i++}`;
		}
		data[key] = obj.data;
		updateAnalysis();
	}
	function removeComponent(key: string) {
		delete data[key];
		updateAnalysis();
	}
</script>

<div class="mixture-list grid gap-4">
	{#each Object.entries(data) as [name, entry] (name)}
		<div class="mixture-item flex items-center space-x-4 rounded bg-white p-4 shadow">
			{#if isSpirit(entry)}
				<SpiritComponent
					{name}
					volume={entry.volume}
					abv={entry.abv}
					on:update={updateFromIngredient}
				/>
			{:else if isWater(entry)}
				<WaterComponent {name} volume={entry.volume} on:update={updateFromIngredient} />
			{:else if isSugar(entry)}
				<SugarComponent {name} mass={entry.mass} on:update={updateFromIngredient} />
			{:else if isSyrup(entry)}
				<SyrupComponent
					{name}
					volume={entry.volume}
					brix={entry.brix}
					on:update={updateFromIngredient}
				/>
			{/if}
			<Fab on:click={() => removeComponent(name)} mini>
				<Icon class="material-icons">cancel</Icon>
			</Fab>

		</div>
	{/each}

	<div class="flex items-center space-x-4">
		<Fab on:click={addSpirit} extended>
			<Icon class="material-icons">add_circle</Icon>
			<Label>spirit</Label>
		</Fab>
		{#if !Object.values(data).some(isWater)}
			<Fab on:click={addWater} extended>
				<Icon class="material-icons">add_circle</Icon>
				<Label>water</Label>
			</Fab>
		{/if}
		{#if !Object.values(data).some(isSugar)}
			<Fab on:click={addSugar} extended>
				<Icon class="material-icons">add_circle</Icon>
				<Label>sugar</Label>
			</Fab>
		{/if}
		<Fab on:click={addSyrup} extended>
			<Icon class="material-icons">add_circle</Icon>
			<Label>syrup</Label>
		</Fab>
	</div>

	<div class="mixture-state mt-6">
		<h2 class="mb-4 text-2xl font-bold">Totals</h2>
		<ABVComponent abv={analysis.abv} onInput={handleAbvInput} />

		<BrixComponent brix={analysis.brix} onInput={handleBrixInput} />
		<VolumeComponent volume={analysis.volume} onInput={handleVolumeInput} />
		<MassComponent mass={analysis.mass} onInput={null} />
	</div>
</div>

<style>
	.mixture-item {
		margin-bottom: 1rem;
	}
</style>
