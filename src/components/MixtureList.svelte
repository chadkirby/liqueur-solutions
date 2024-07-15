<script lang="ts">
	import Textfield from '@smui/textfield';
	import Button, { Icon, Label } from '@smui/button';
  import Select, { Option } from '@smui/select';
	import {
		Sweetener as SweetenerObject,
		Water as WaterObject,
		mixtureStore,
		updateUrl,
		type SerializedComponent,
		SweetenerTypes,
		newSyrup,
		newSpirit
	} from '$lib';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	import BrixComponent from './Brix.svelte';
	import CalComponent from './Cal.svelte';
	import debounce from 'lodash.debounce';

	export let data: {liqueur: string, components: SerializedComponent[]};

	// Initialize the store with the data from the load function
	mixtureStore.deserialize(data);




	const handleNameInput = (id: string) => debounce((event: CustomEvent) => {
		const newName = (event.target as HTMLInputElement).value;
		mixtureStore.updateComponentName(id, newName);
	}, 100);

	function addSpirit() {
		mixtureStore.addComponents([{name: 'spirit', id: 'spirit', component: newSpirit(100, 40)}]);
	}
	function addWater() {
		mixtureStore.addComponents([{name: "water", id: "water", component: new WaterObject(100)}]);
	}
	function addSugar() {
		mixtureStore.addComponents([{
			name: "sugar",
			id: "sweetener-sucrose",
			component: new SweetenerObject('sucrose', 100)
		}]);
	}
	function addSyrup() {
		mixtureStore.addComponents([{name: "syrup", id: "mixture", component: newSyrup(100, 50)}]);
	}

	function removeComponent(id: string) {
		mixtureStore.removeComponent(id);
	}

</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Textfield
		class="col-span-4"
		input$class="font-sans text-2xl font-bold"
		value={$mixtureStore.title}
		on:input={() => updateUrl()}
		required
	/>
	{#each $mixtureStore.mixture.components.entries() as [index, { name, id, component: entry }] (index)}
		<div class="flex flex-col items-stretch mt-2">
			<div class="relative">
				{#if entry instanceof SweetenerObject}
					<Select
						class="w-full"
						selectedText$class="font-sans text-lg font-bold"
						variant="outlined"
						bind:value={entry.subType}
						label={entry.type}
						required
					>
						{#each SweetenerTypes as type}
							<Option value={type}>{type}</Option>
						{/each}
					</Select>
				{:else}
					<Textfield
						class="w-full"
						input$class="font-sans text-lg font-bold"
						variant="outlined"
						value={name}
						label={entry.type}
						on:input={handleNameInput(id)}
						required
					/>
				{/if}
				<Button class="absolute -top-1 -right-5" color="secondary"  on:click={() => removeComponent(id)}>
					<Icon class="material-icons">cancel</Icon>
				</Button>
			</div>

			<div class="flex flex-row grow my-1">
				{#if entry.type.startsWith('sweetener')}
					<MassComponent storeId={id} />
				{:else}
					<VolumeComponent storeId={id} />
				{/if}
				<ABVComponent storeId={id} />
				<BrixComponent storeId={id} />
				<CalComponent storeId={id} />
			</div>
		</div>
	{/each}
</div>

<div class="mt-4 grid grid-cols-4 no-print">
	<Button color="secondary" class="scale-75" on:click={addSpirit}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">spirit</Label>
	</Button>
	<Button color="secondary" class="scale-75" on:click={addSugar}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">sweetener</Label>
	</Button>
	<Button color="secondary" class="scale-75" on:click={addSyrup}>
		<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
		<Label class="scale-125 p-2">syrup</Label>
	</Button>
	{#if !$mixtureStore.mixture.findByType(o => o instanceof WaterObject)}
		<Button color="secondary" class="scale-75" on:click={addWater}>
			<Icon class="material-icons scale-150 mb-1">add_circle</Icon>
			<Label class="scale-125 p-2">water</Label>
		</Button>
	{/if}
</div>

<div class="mt-2 items-center border-t-2 pt-2 gap-x-2 gap-y-2">
	<h2 class="col-span-4 mb-4 basis-full text-xl font-bold">Totals</h2>
	<div class="flex flex-row">
		<VolumeComponent storeId="totals" />
		<ABVComponent storeId="totals" />
		<BrixComponent storeId="totals" />
		<CalComponent storeId="totals" />
	</div>
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}

	:global(.mdc-notched-outline__notch) {
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

	:global(.mdc-select__dropdown-icon) {
		/* position the sweetener dropdown caret */
		margin-right: calc(100% - 10em);
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
		:global(.mdc-select__dropdown-icon) {
			display: none;
		}
}
</style>
