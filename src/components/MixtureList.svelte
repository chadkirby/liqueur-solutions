<script lang="ts">
	import {
		Button,
		Input,
		ButtonGroup,
		Dropdown,
		DropdownUl,
		DropdownLi,
		uiHelpers
	} from 'svelte-5-ui-lib';
	import { CirclePlusSolid } from 'flowbite-svelte-icons';
	import { sineIn } from 'svelte/easing';

	import {
		Sweetener as SweetenerObject,
		Water as WaterObject,
		mixtureStore,
		updateUrl,
		type SerializedComponent,
		newSyrup,
		newSpirit,
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
	import TextEntry from './TextEntry.svelte';
	import debounce from 'lodash.debounce';
	import SweetenerDropdown from './SweetenerDropdown.svelte';
	import WaterDisplayGroup from './WaterDisplayGroup.svelte';
	import SweetenerDisplayGroup from './SweetenerDisplayGroup.svelte';
	import SpiritDisplayGroup from './SpiritDisplayGroup.svelte';
	import SyrupDisplayGroup from './SyrupDisplayGroup.svelte';

	interface Props {
		data: { liqueur: string; components: SerializedComponent[] };
	}

	let { data }: Props = $props();

	// Initialize the store with the data from the load function
	mixtureStore.deserialize(data);

	const handleTitleInput = () =>
		debounce((event: InputEvent) => {
			const newName = (event.target as HTMLInputElement).value;
			mixtureStore.setTitle(newName);
		}, 100);

	function addSpirit() {
		closeDropdown();
		mixtureStore.addComponents([{ name: 'spirit', id: 'spirit', component: newSpirit(100, 40) }]);
	}
	function addWater() {
		closeDropdown();
		mixtureStore.addComponents([{ name: 'water', id: 'water', component: new WaterObject(100) }]);
	}
	function addSugar() {
		closeDropdown();
		mixtureStore.addComponents([
			{
				name: 'sugar',
				id: 'sweetener-sucrose',
				component: new SweetenerObject('sucrose', 100)
			}
		]);
	}
	function addSyrup() {
		closeDropdown();
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

	let dropdown = uiHelpers();
	let dropdownStatus = $state(false);
	let closeDropdown = dropdown.close;
	$effect(() => {
		// this can be done adding nav.navStatus directly to DOM element
		// without using effect
		dropdownStatus = dropdown.isOpen;
	});
	let transitionParams = {
		y: 0,
		duration: 100,
		easing: sineIn
	};

	let dropdownRef: HTMLDivElement | null = $state(null);
</script>

<div class="relative">
	{#if dropdownStatus}
		<button
			type="button"
			class="fixed inset-0 bg-transparent cursor-default"
			onclick={closeDropdown}
			aria-label="Close dropdown"
		></button>

		<Dropdown
			{dropdownStatus}
			{closeDropdown}
			params={transitionParams}
			class="fixed -translate-y-full"
			style="
				top: {dropdownRef?.getBoundingClientRect().top! + 2}px;
				left: {dropdownRef?.getBoundingClientRect().left! - 8}px;
			"
		>
			<DropdownUl>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSpirit}>
						<CirclePlusSolid size="lg" class="mr-1"/> <span class="mt-[1px]">spirit</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSugar}>
						<CirclePlusSolid size="lg" class="mr-1"/> <span class="mt-[1px]">sweetener</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSyrup}>
						<CirclePlusSolid size="lg" class="mr-1"/> <span class="mt-[1px]">syrup</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addWater}>
						<CirclePlusSolid size="lg" class="mr-1"/> <span class="mt-[1px]">water</span>
					</button>
				</DropdownLi>
			</DropdownUl>
		</Dropdown>
	{/if}
</div>

<div class="flex flex-col gap-x-2 gap-y-2">
	<Input
		value={$mixtureStore.title}
		oninput={handleTitleInput()}
		required
		class="text-l font-bold mb-2"
	/>

	{#each $mixtureStore.mixture.components.entries() as [index, { name, id, component: entry }] (index)}
		<div class="flex flex-col items-stretch">
			<div class="relative">
				{#if entry instanceof Sweetener}
					<SweetenerDropdown componentId={id} component={entry} />
				{:else}
					<TextEntry value={name} component={entry} componentId={id} />
				{/if}
			</div>

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
	{/each}
</div>

<div class="mt-2"  bind:this={dropdownRef}>
	<button
		class="
			flex
			w-full
			justify-start
			border-t-2
			border-gray-300
			relative
			"
		onclick={dropdown.toggle}
	>
		<CirclePlusSolid size="lg" class="absolute -ml-2 -translate-y-[55%] bg-white"/>
	</button>
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
