<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		Input,
		Label
	} from 'svelte-5-ui-lib';

	import {
		Water as WaterObject,
		mixtureStore,
		type SerializedComponent,
		Mixture,
		type AnyComponent,
		Sweetener,
		Water,
		isSpirit
	} from '$lib';
	import VolumeComponent from './Volume.svelte';
	import ABVComponent from './ABV.svelte';
	import BrixComponent from './Brix.svelte';
	import CalComponent from './Cal.svelte';
	import debounce from 'lodash.debounce';
	import SweetenerDropdown from './SweetenerDropdown.svelte';
	import WaterDisplayGroup from './WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './SyrupDisplayGroup.svelte';
	import RemoveButton from './RemoveButton.svelte';

	const handleTitleInput = () =>
		debounce((event: InputEvent) => {
			const newName = (event.target as HTMLInputElement).value;
			mixtureStore.setTitle(newName);
		}, 100);


	function isSyrup(mx: AnyComponent): mx is Mixture {
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
		value={$mixtureStore.title}
		oninput={handleTitleInput()}
		required
		class="text-l font-bold mb-2"
	/>

	<Accordion flush={true} isSingle={false}>
		{#each $mixtureStore.mixture.components.entries() as [index, { name, id, component: entry }] (index)}
			<AccordionItem  class="pt-2 pb-2">
				{#snippet header()}
				<div class="flex flex-row items-center gap-x-2">
					<RemoveButton componentId={id}/>
					<Label>{entry.summarize(name)}</Label>
				</div>
				{/snippet}
				<div class="flex flex-col items-stretch">
					{#if entry instanceof Sweetener || isSyrup(entry)}
						<SweetenerDropdown componentId={id} component={entry} {name} />
					{:else}
						<Input
							value={name}
							class="w-full pr-8"
							oninput={(e) => mixtureStore.updateComponentName(id, e.currentTarget.value)}
						/>
					{/if}
					<div class="flex flex-row grow my-1">
						{#if entry instanceof Sweetener}
							<SweetenerDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Water}
							<WaterDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Mixture && isSpirit(entry)}
							<SpiritDisplayGroup componentId={id} component={entry} />
						{:else if entry instanceof Mixture && isSyrup(entry)}
							<SyrupDisplayGroup componentId={id} component={entry} />
						{/if}
					</div>
				</div>
			</AccordionItem>
		{/each}
	</Accordion>
</div>

<div class="mt-2 items-center pt-2 gap-x-2 gap-y-2">
	<h2
		class="
		col-span-4
		mb-2
		basis-full
		text-xl
		font-bold
	"
	>
		Totals
	</h2>
	<div class="flex flex-row">
		<VolumeComponent componentId="totals" component={$mixtureStore.mixture} />
		<ABVComponent componentId="totals" component={$mixtureStore.mixture} />
		<BrixComponent componentId="totals" component={$mixtureStore.mixture} />
		<CalComponent componentId="totals" component={$mixtureStore.mixture} />
	</div>
</div>

<style>
	:root {
		--screenGray: rgb(0 0 0 / 50%);
		--printGray: rgb(0 0 0 / 75%);
		--mdc-theme-primary: #676778;
		--mdc-theme-secondary: #676778;
	}

	@media print {
		.no-print {
			display: none;
		}
	}
</style>
