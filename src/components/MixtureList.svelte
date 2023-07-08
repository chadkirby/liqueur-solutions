<script lang="ts">
	import Textfield from '@smui/textfield';
	import Fab, { Icon, Label } from '@smui/fab';
	import { goto } from '$app/navigation';
	import {
		Mixture as MixtureObject,
		Sugar as SugarObject,
		Water as WaterObject,
		Spirit as SpiritObject,
		Syrup as SyrupObject,
		solve,
		isSugarData,
		isSyrupData,
		isSpiritData,
		isWaterData,
		type Component,
		type SugarData,
		type SyrupData
	} from '$lib';
	import SpiritComponent from './Spirit.svelte';
	import SugarComponent from './Sugar.svelte';
	import WaterComponent from './Water.svelte';
	import SyrupComponent from './Syrup.svelte';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	import BrixComponent from './Brix.svelte';
	import debounce from 'lodash.debounce';
	import type { PageData } from '../routes/[liqueur]/$types.js';

	export let data: PageData;

	function dataToMixture(d: PageData = data) {
		const ingredients = (d.components || []).map(({ name, data }) => {
			if (isSpiritData(data)) return { name, component: new SpiritObject(data.volume, data.abv) };
			if (isWaterData(data)) return { name, component: new WaterObject(data.volume) };
			if (isSugarData(data)) return { name, component: new SugarObject(data.mass) };
			if (isSyrupData(data)) return { name, component: new SyrupObject(data.volume, data.brix) };
			throw new Error('Unknown mixture type');
		});
		return new MixtureObject<Component>(ingredients);
	}

	function mixtureToData(mixture: MixtureObject) {
		const components = mixture.componentObjects.map((x) => x.data);
		return { components };
	}

	let analysis = dataToMixture().analyze(0);

	function updateAnalysis(mixture = dataToMixture()) {
		analysis = mixture.analyze(0);
		goto(`/${encodeURIComponent(data.liqueur)}?${mixture.serialize(1)}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	const updateFromIngredient = debounce((e) => {
		const updated = e.detail;
		const which = data.components.find(({ name }) => name === updated.name);
		if (!which) return;
		const mx = which.data;
		if (updated.volume && mx && 'volume' in mx) mx.volume = updated.volume;
		if (updated.abv && mx && 'abv' in mx) mx.abv = updated.abv;
		if (updated.mass && mx && 'mass' in mx) mx.mass = updated.mass;
		if (updated.brix && mx && 'brix' in mx) mx.brix = updated.brix;

		updateAnalysis();
	}, 100);

	const handleVolumeInput = debounce((event: CustomEvent) => {
		solveVolume(event.detail);
	}, 100);

	function solveVolume(newVolume: number) {
		if (newVolume < 1) return;
		const dataMx = dataToMixture();
		if (newVolume === dataMx.volume) return;
		const delta = newVolume / dataMx.volume;
		for (const item of dataMx.componentObjects) {
			item.volume *= delta;
		}

		updateAnalysis(dataMx);
	}

	const handleAbvInput = debounce((event: CustomEvent) => {
		solveAbv(event.detail);
	}, 100);

	const changeName = debounce((newName: string, index: number) => {
		const entry = data.components[index];
		if (!entry) return;
		if (newName === entry.name) return;
		entry.name = newName;
		updateAnalysis();
	}, 100);

	function solveAbv(newAbv: number) {
		if (newAbv < 1) return;
		const mx = dataToMixture();
		const oldAbv = mx.abv;
		if (newAbv === oldAbv) return;
		const spirit = mx.findByType(SpiritObject.is);
		if (!spirit) return;
		const solution = solve(spirit, newAbv, analysis.brix);
		updateDataFromSolution(solution.mixture);
	}

	function updateDataFromSolution(solvedMx: MixtureObject) {
		const dataMx = dataToMixture();

		// update sugar
		const sugarItems = dataMx.componentObjects.filter(
			(x): x is SugarObject | SyrupObject => SugarObject.is(x) || SyrupObject.is(x)
		);
		const sugarProportions = sugarItems.map((x) => x.sugarMass / dataMx.sugarMass);
		const sugarSolution = solvedMx.findByType(SugarObject.is)!;
		for (const [i, item] of sugarItems.entries()) {
			const proportion = sugarProportions[i];
			const desiredMass = Math.round(sugarSolution.sugarMass * proportion);
			const sugar = SugarObject.is(item) ? item : item.findByType(SugarObject.is)!;
			sugar.mass = desiredMass;
		}

		// update water
		const [waterItem] = dataMx.componentObjects.filter(WaterObject.is);
		const waterSolution = solvedMx.findByType(WaterObject.is)!;
		waterItem.volume = waterSolution.volume;

		// update spirit
		const [spiritItem] = dataMx.componentObjects.filter(SpiritObject.is);
		const spiritSolution = solvedMx.findByType(SpiritObject.is)!;
		spiritItem.volume = spiritSolution.volume;

		updateAnalysis(dataMx);
	}

	const handleBrixInput = debounce((event: CustomEvent) => {
		solveBrix(event.detail);
	}, 100);

	function solveBrix(newBrix: number) {
		if (newBrix < 0) return;
		const mx = dataToMixture();
		const oldBrix = mx.brix;
		if (newBrix === oldBrix) return;
		const spirit = mx.findByType(SpiritObject.is);
		if (!spirit) return;
		const solution = solve(spirit, analysis.abv, newBrix);
		updateDataFromSolution(solution.mixture);
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
		while (data.components.some((x) => x.name === key)) {
			key = `${obj.type}-${i++}`;
		}
		data.components.push({ name: key, data: obj });
		updateAnalysis();
	}
	function removeComponent(key: string) {
		const index = data.components.findIndex((x) => x.name === key);
		if (index === -1) return;
		data.components.splice(index, 1);
		updateAnalysis();
	}
</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Textfield
		class="col-span-4"
		input$class="font-sans text-2xl font-bold"
		bind:value={data.liqueur}
		on:input={() => updateAnalysis()}
		required
	/>

	{#each data.components.entries() as [index, { name, data: entry }] (index)}
		<div class="flex flex-col">
			<div class="flex flex-row gap-x-2 max-w-lg items-center">
				<Textfield
					class="flex-grow"
					input$class="font-sans text-lg font-bold"
					variant="outlined"
					value={name}
					label={entry.type}
					on:input={(event) =>
						event.target instanceof HTMLInputElement && changeName(event.target.value, index)}
					required
				/>
				<Fab on:click={() => removeComponent(name)} mini>
					<Icon class="material-icons">cancel</Icon>
				</Fab>
			</div>

			<div class="flex flex-row">
				{#if isSpiritData(entry)}
					<SpiritComponent
						{name}
						volume={entry.volume}
						abv={entry.abv}
						on:update={updateFromIngredient}
					/>
				{:else if isWaterData(entry)}
					<WaterComponent {name} volume={entry.volume} on:update={updateFromIngredient} />
				{:else if isSugarData(entry)}
					<SugarComponent {name} mass={entry.mass} on:update={updateFromIngredient} />
				{:else if isSyrupData(entry)}
					<SyrupComponent
						{name}
						volume={entry.volume}
						brix={entry.brix}
						on:update={updateFromIngredient}
					/>
				{/if}
			</div>
			<hr class="col-span-4 w-full" />
		</div>
	{/each}
</div>

<div class="mt-3 flex flex-row items-center gap-x-2 gap-y-2 pt-1">
	<Fab on:click={addSpirit} extended>
		<Icon class="material-icons">add_circle</Icon>
		<Label>spirit</Label>
	</Fab>
	{#if !Object.values(data.components).some((c) => isWaterData(c.data))}
		<Fab on:click={addWater} extended>
			<Icon class="material-icons">add_circle</Icon>
			<Label>water</Label>
		</Fab>
	{/if}
	{#if !Object.values(data.components).some((c) => isSugarData(c.data))}
		<Fab on:click={addSugar} extended>
			<Icon class="material-icons">add_circle</Icon>
			<Label>sugar</Label>
		</Fab>
	{/if}
	{#if !Object.values(data.components).some((c) => isSyrupData(c.data))}
		<Fab on:click={addSyrup} extended>
			<Icon class="material-icons">add_circle</Icon>
			<Label>syrup</Label>
		</Fab>
	{/if}
</div>

<div class="mt-3 items-center gap-x-2 gap-y-2 border-t-2 pt-1">
	<h2 class="col-span-4 mb-4 basis-full text-xl font-bold">Totals</h2>
	<div class="flex flex-row flex-wrap">
		<ABVComponent abv={analysis.abv} onInput={handleAbvInput} />
		<BrixComponent brix={analysis.brix} onInput={handleBrixInput} />
		<VolumeComponent volume={analysis.volume} onInput={handleVolumeInput} />
		<MassComponent mass={analysis.mass} onInput={null} />
	</div>
</div>
