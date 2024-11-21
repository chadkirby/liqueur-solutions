<script lang="ts">
	import {
		mixtureStore,
		newSpirit,
		newSyrup,
		Sweetener,
		Water,
		type SerializedComponent
	} from '$lib';
	import {
		BottomNav,
		BottomNavItem,
		uiHelpers,
		Dropdown,
		DropdownUl,
		DropdownLi
	} from 'svelte-5-ui-lib';
	import MixtureList from '../../components/MixtureList.svelte';
	import { CirclePlusSolid, PlusOutline } from 'flowbite-svelte-icons';
	import { sineIn } from 'svelte/easing';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { liqueur: string; components: SerializedComponent[] };
	}

	let { data }: Props = $props();

	// Initialize the store with the data from the load function
	mixtureStore.deserialize(data);

	let dropdownRef: HTMLDivElement | null = $state(null);
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

	function addSpirit() {
		closeDropdown();
		mixtureStore.addComponents([{ name: 'spirit', id: 'spirit', component: newSpirit(100, 40) }]);
	}
	function addWater() {
		closeDropdown();
		mixtureStore.addComponents([{ name: 'water', id: 'water', component: new Water(100) }]);
	}
	function addSugar() {
		closeDropdown();
		mixtureStore.addComponents([
			{
				name: 'sugar',
				id: 'sweetener-sucrose',
				component: new Sweetener('sucrose', 100)
			}
		]);
	}
	function addSyrup() {
		closeDropdown();
		mixtureStore.addComponents([
			{ name: 'simple syrup', id: 'syrup', component: newSyrup(100, 50) }
		]);
	}
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
				top: {dropdownRef!.getBoundingClientRect().top}px;
				left: {dropdownRef!.getBoundingClientRect().left + dropdownRef!.getBoundingClientRect().width / 2 - 60}px;
			"
		>
			<DropdownUl>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSpirit}>
						<CirclePlusSolid size="lg" class="mr-1" /> <span class="mt-[1px]">spirit</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSugar}>
						<CirclePlusSolid size="lg" class="mr-1" /> <span class="mt-[1px]">sweetener</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addSyrup}>
						<CirclePlusSolid size="lg" class="mr-1" /> <span class="mt-[1px]">syrup</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex" href="/">
					<button class="flex w-32 justify-start" onclick={addWater}>
						<CirclePlusSolid size="lg" class="mr-1" /> <span class="mt-[1px]">water</span>
					</button>
				</DropdownLi>
			</DropdownUl>
		</Dropdown>
	{/if}
</div>

<div class="mixtures-page max-w-lg mx-auto">
	<MixtureList />

	<BottomNav position="absolute" navType="application" innerClass="grid-cols-1">
		<div class="flex items-center justify-center" bind:this={dropdownRef}>
			<BottomNavItem
				btnName="Create new item"
				appBtnPosition="middle"
				btnClass="inline-flex items-center justify-center w-10 h-10 font-medium bg-primary-600 rounded-full hover:bg-primary-700 group focus:ring-4 focus:ring-primary-300 focus:outline-none dark:focus:ring-primary-800"
			>
				<PlusOutline id="create" class="text-white" onclick={() => dropdown.isOpen ? dropdown.close() : dropdown.open()}/>
			</BottomNavItem>
		</div>
	</BottomNav>
</div>

<style>
	.mixtures-page {
		padding: 1rem;
	}
</style>
