<script lang="ts">
	import Textfield from '@smui/textfield';
	import Button, { Icon, Label } from '@smui/button';
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
		if (updated.locked && mx && 'locked' in mx) mx.locked = updated.locked;

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
			item.set('volume', item.volume * delta);
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
		mx.set('abv', newAbv);
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
		mx.set('brix', newBrix);
		updateAnalysis(mx);
	}

	function addSpirit() {
		addObj(new SpiritObject(100, 40, 'none'));
	}
	function addWater() {
		addObj(new WaterObject(100, 'none'));
	}
	function addSugar() {
		addObj(new SugarObject(100, 'none'));
	}
	function addSyrup() {
		addObj(new SyrupObject(100, 50, 'none'));
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
			<div class="relative">
				<Textfield
					class="w-full"
					input$class="font-sans text-lg font-bold"
					variant="outlined"
					value={name}
					label={entry.type}
					on:input={(event) =>
						event.target instanceof HTMLInputElement && changeName(event.target.value, index)}
					required
				/>
				<Button class="absolute -top-1 -right-5" color="secondary"  on:click={() => removeComponent(name)}>
					<Icon class="material-icons">cancel</Icon>
				</Button>
			</div>

			<div class="flex flex-row grow my-1">
				{#if isSpiritData(entry)}
					<SpiritComponent
						{name}
						volume={entry.volume}
						abv={entry.abv}
						locked={entry.locked}
						on:update={updateFromIngredient}
					/>
				{:else if isWaterData(entry)}
					<WaterComponent {name} volume={entry.volume} locked={entry.locked} on:update={updateFromIngredient} />
				{:else if isSugarData(entry)}
					<SugarComponent {name} mass={entry.mass} locked={entry.locked} on:update={updateFromIngredient} />
				{:else if isSyrupData(entry)}
					<SyrupComponent
						{name}
						volume={entry.volume}
						brix={entry.brix}
						locked={entry.locked}
						on:update={updateFromIngredient}
					/>
				{/if}
			</div>
			<hr class="col-span-4 w-full" />
		</div>
	{/each}
</div>

<div class="mt-2 grid grid-cols-4 no-print">

	<Button color="secondary" class="scale-75" on:click={addSpirit}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">spirit</Label>
	</Button>
	{#if !Object.values(data.components).some((c) => isWaterData(c.data))}
		<Button color="secondary" class="scale-75" on:click={addWater}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">water</Label>
		</Button>
	{/if}
	{#if !Object.values(data.components).some((c) => isSugarData(c.data))}
		<Button color="secondary" class="scale-75" on:click={addSugar}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">sugar</Label>
		</Button>
	{/if}
	{#if !Object.values(data.components).some((c) => isSyrupData(c.data))}
		<Button color="secondary" class="scale-75" on:click={addSyrup}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">syrup</Label>
		</Button>
	{/if}
</div>

<div class="mt-2 items-center gap-x-2 gap-y-2 border-t-2 pt-1">
	<h2 class="col-span-4 mb-4 basis-full text-xl font-bold">Totals</h2>
	<div class="flex flex-row">
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

	:global(.mdc-text-field__affix--suffix) {
		padding-left: 4px;
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
