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
		isSugarData,
		isSyrupData,
		isSpiritData,
		isWaterData,
		type Component,
		type SugarData,
		type SyrupData,
		dataToMixture
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
	import { Ethanol } from '$lib/ethanol.js';

	export let data: PageData;

	function mixtureToData(mixture: MixtureObject) {
		const components = mixture.componentObjects.map((x) => x.data);
		return { components };
	}

	let analysis = dataToMixture(data).analyze(1);

	function updateAnalysis(mixture = dataToMixture(data)) {
		if (mixture.isValid) {
			analysis = mixture.analyze(1);
			goto(`/${encodeURIComponent(data.liqueur)}?${mixture.serialize(1)}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		}
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
		if (!roundEq(event.detail, analysis.volume)) {
			solveVolume(event.detail);
		}
	}, 100);

	function roundEq(a: number, b: number) {
		return Math.round(a) === Math.round(b);
	}

	function solveVolume(newVolume: number) {
		if (newVolume < 1) return;
		const dataMx = dataToMixture(data);
		if (newVolume === dataMx.volume) return;
		const delta = newVolume / dataMx.volume;
		for (const item of dataMx.componentObjects) {
			item.volume *= delta;
		}

		updateAnalysis(dataMx);
	}

	const handleAbvInput = debounce((event: CustomEvent) => {
		if (!roundEq(event.detail, analysis.abv)) {
			solveAbv(event.detail);
		}
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
		const mx = dataToMixture(data);
		mx.abv = newAbv;
		updateAnalysis(mx);
	}

	const handleBrixInput = debounce((event: CustomEvent) => {
		if (!roundEq(event.detail, analysis.brix)) {
			solveBrix(event.detail);
		}
	}, 100);

	function solveBrix(newBrix: number) {
		if (newBrix < 0) return;
		const mx = dataToMixture(data);
		mx.brix = newBrix;
		updateAnalysis(mx);
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
		<div class="flex flex-col items-stretch">
			<div class="flex flex-row items-center gap-x-2">
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

			<div class="flex flex-row grow">
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

<div class="mt-3 flex flex-row items-center gap-x-2 gap-y-2 pt-1 no-print">
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
		<VolumeComponent volume={analysis.volume} onInput={handleVolumeInput} />
		<MassComponent mass={analysis.mass} onInput={null} />
		<ABVComponent abv={analysis.abv} onInput={handleAbvInput} />
		<BrixComponent brix={analysis.brix} onInput={handleBrixInput} />
	</div>
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
	}

	:global(.mdc-text-field--focused .mdc-notched-outline__notch) {
		border-left: none;
		border-right: none;
	}



	:global(.mdc-text-field--disabled .mdc-text-field__input) {
    color: var(--screenGray)
	}
	:global(.mdc-text-field--disabled .mdc-floating-label) {
    color: var(--screenGray)
	}


	@media print {
    .no-print {
        display: none;
    }
		:global(.mdc-text-field--disabled .mdc-text-field__input) {
			color: var(--printGray);
		}
		:global(.mdc-text-field--disabled .mdc-floating-label) {
			color: var(--printGray)
		}

}
</style>
