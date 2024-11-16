<script lang="ts">
  import { Button, Select, Input, ButtonGroup } from 'svelte-5-ui-lib';
	import { CirclePlusSolid, CloseCircleSolid} from "flowbite-svelte-icons";

	import {
		Sweetener as SweetenerObject,
		Water as WaterObject,
		mixtureStore,
		updateUrl,
		type SerializedComponent,
		SweetenerTypes,
		newSyrup,
		newSpirit,
		Mixture,
		type AnyComponent,
		Sweetener,

		getLabel

	} from '$lib';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import MassComponent from './Mass.svelte';
	import BrixComponent from './Brix.svelte';
	import CalComponent from './Cal.svelte';
	import TextEntry from './TextEntry.svelte';
	import debounce from 'lodash.debounce';

	interface Props {
		data: { liqueur: string; components: SerializedComponent[] };
	}

	let { data }: Props = $props();

	// Initialize the store with the data from the load function
	mixtureStore.deserialize(data);

	const handleNameInput = (id: string) =>
		debounce((event: CustomEvent) => {
			const newName = (event.target as HTMLInputElement).value;
			mixtureStore.updateComponentName(id, newName);
		}, 100);

	function addSpirit() {
		mixtureStore.addComponents([{ name: 'spirit', id: 'spirit', component: newSpirit(100, 40) }]);
	}
	function addWater() {
		mixtureStore.addComponents([{ name: 'water', id: 'water', component: new WaterObject(100) }]);
	}
	function addSugar() {
		mixtureStore.addComponents([
			{
				name: 'sugar',
				id: 'sweetener-sucrose',
				component: new SweetenerObject('sucrose', 100)
			}
		]);
	}
	function addSyrup() {
		mixtureStore.addComponents([{ name: 'syrup', id: 'mixture', component: newSyrup(100, 50) }]);
	}

	function isSyrup(mx: AnyComponent) {
		return Boolean(
			mx instanceof Mixture &&
				mx.components.length === 2 &&
				mx.findByType((x) => x instanceof WaterObject) &&
				mx.findByType((x) => x instanceof Sweetener)
		);
	}



</script>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Input
		class="col-span-4"
		value={$mixtureStore.title}
		on:input={() => updateUrl()}
		required
	/>
	{#each $mixtureStore.mixture.components.entries() as [index, { name, id, component: entry }] (index)}
		<div class="flex flex-col items-stretch mt-2">
			<div class="relative">
				<TextEntry
					value={name}
					component={entry}
					componentId={id}
				/>
			</div>

			<div class="flex flex-row grow my-1">
				{#if entry.type.startsWith('sweetener')}
					<MassComponent componentId={id} component={entry} />
				{:else}
					<VolumeComponent componentId={id} component={entry} />
				{/if}
				<ABVComponent componentId={id} component={entry} />
				<BrixComponent componentId={id} component={entry} />
				<CalComponent componentId={id} />
			</div>
		</div>
	{/each}
</div>

<div class="mt-4 grid grid-cols-4 no-print">
	<Button color="secondary" class="scale-75" onclick={addSpirit}>
		<CirclePlusSolid />spirit
	</Button>
	<Button color="secondary" class="scale-75" onclick={addSugar}>
		<CirclePlusSolid />sweetener
	</Button>
	<Button color="secondary" class="scale-75" onclick={addSyrup}>
		<CirclePlusSolid />syrup
	</Button>
	{#if !$mixtureStore.mixture.findByType((o) => o instanceof WaterObject)}
		<Button color="secondary" class="scale-75" onclick={addWater}>
			<CirclePlusSolid />water
		</Button>
	{/if}
</div>

<div class="mt-2 items-center border-t-2 pt-2 gap-x-2 gap-y-2">
	<h2 class="col-span-4 mb-4 basis-full text-xl font-bold">Totals</h2>
	<div class="flex flex-row">
		<VolumeComponent componentId="totals" component={$mixtureStore.mixture} />
		<ABVComponent componentId="totals" component={$mixtureStore.mixture} />
		<BrixComponent componentId="totals" component={$mixtureStore.mixture} />
		<CalComponent componentId="totals" />
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
		color: var(--screenGray);
	}
	:global(.mdc-text-field--disabled .mdc-floating-label) {
		color: var(--screenGray);
	}

	:global(.mdc-text-field__affix--suffix) {
		padding-left: 4px;
	}

	/* position the sweetener dropdown caret to the left of the label */
	:global(.mdc-select__anchor) {
		flex-direction: row-reverse;
	}
	/* adjust the sweetener dropdown caret margins */
	:global(.mdc-select__dropdown-icon) {
		margin-left: -6px;
		margin-right: 0px;
	}

	@media print {
		.no-print {
			display: none;
		}
		:global(.mdc-text-field--disabled .mdc-text-field__input) {
			color: var(--printGray);
		}
		:global(.mdc-text-field--disabled .mdc-floating-label) {
			color: var(--printGray);
		}
		:global(.mdc-select__dropdown-icon) {
			display: none;
		}
	}
</style>
