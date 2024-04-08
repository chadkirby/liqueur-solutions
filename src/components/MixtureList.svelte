<script lang="ts">
	import Textfield from '@smui/textfield';
	import Button, { Icon, Label } from '@smui/button';
	import { goto } from '$app/navigation';
	import {
		Sugar as SugarObject,
		Water as WaterObject,
		Spirit as SpiritObject,
		Syrup as SyrupObject,
		isSugarData,
		isWaterData,
		mixtureStore
	} from '$lib';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	import BrixComponent from './Brix.svelte';
	import debounce from 'lodash.debounce';

	export let liqueurName: string;

	function updateUrl() {
		const mixture = mixtureStore.getMixture();
		if (mixture.isValid) {
			goto(`/${encodeURIComponent(liqueurName)}?${mixture.serialize(1)}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		}
	}

	const changeName = debounce((newName: string, id: string) => {
		mixtureStore.updateComponentName(id, newName);
	}, 100);

	function addSpirit() {
		mixtureStore.addComponents([{name: 'spirit', id: 'spirit', data: new SpiritObject(100, 40).data}]);
	}
	function addWater() {
		mixtureStore.addComponents([{name: "water", id: "water", data: new WaterObject(100).data}]);
	}
	function addSugar() {
		mixtureStore.addComponents([{name: "sugar", id: "sugar", data: new SugarObject(100).data}]);
	}
	function addSyrup() {
		mixtureStore.addComponents([{name: "syrup", id: "syrup", data: new SyrupObject(100, 50).data}]);
	}

	function removeComponent(id: string) {
		mixtureStore.removeComponent(id);
	}

</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Textfield
		class="col-span-4"
		input$class="font-sans text-2xl font-bold"
		bind:value={liqueurName}
		on:input={() => updateUrl()}
		required
	/>

	{#each $mixtureStore.components.entries() as [index, { name, id, data: entry }] (index)}
		<div class="flex flex-col items-stretch mt-2">
			<div class="relative">
				<Textfield
					class="w-full"
					input$class="font-sans text-lg font-bold"
					variant="outlined"
					value={name}
					label={entry.type}
					on:input={(event) =>
						event.target instanceof HTMLInputElement && changeName(event.target.value, id)}
					required
				/>
				<Button class="absolute -top-1 -right-5" color="secondary"  on:click={() => removeComponent(id)}>
					<Icon class="material-icons">cancel</Icon>
				</Button>
			</div>

			<div class="flex flex-row grow my-1">
				<VolumeComponent storeId={id} />
				<MassComponent storeId={id} />
				<ABVComponent storeId={id} />
				<BrixComponent storeId={id} />
			</div>
		</div>
	{/each}
</div>

<div class="mt-2 items-center gap-x-2 gap-y-2">
	<h2 class="col-span-4 mb-4 basis-full text-xl font-bold">Totals</h2>
	<div class="flex flex-row">
		<VolumeComponent storeId="totals" />
		<MassComponent storeId="totals" />
		<ABVComponent storeId="totals" />
		<BrixComponent storeId="totals" />
	</div>
</div>


<div class="mt-4 grid grid-cols-4 border-t-2 pt-2 no-print">
	<Button color="secondary" class="scale-75" on:click={addSpirit}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">spirit</Label>
	</Button>
	{#if !Object.values($mixtureStore.components).some((c) => isSugarData(c.data))}
		<Button color="secondary" class="scale-75" on:click={addSugar}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">sugar</Label>
		</Button>
	{/if}
	<Button color="secondary" class="scale-75" on:click={addSyrup}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">syrup</Label>
	</Button>
	{#if !Object.values($mixtureStore.components).some((c) => isWaterData(c.data))}
		<Button color="secondary" class="scale-75" on:click={addWater}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">water</Label>
		</Button>
	{/if}
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
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
