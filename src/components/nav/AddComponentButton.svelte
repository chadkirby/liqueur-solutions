<script lang="ts">
	import { mixtureStore, newSpirit, newSyrup, Sweetener, Water } from '$lib';
	import { CirclePlusSolid, PlusOutline } from 'flowbite-svelte-icons';
	import { Dropdown, DropdownLi, DropdownUl, Tooltip, uiHelpers } from 'svelte-5-ui-lib';
	import { sineIn } from 'svelte/easing';
	import Portal from 'svelte-portal';
	import { filesDrawer } from '$lib/files-drawer-store';

	let dropdown = uiHelpers();
	let dropdownStatus = $state(false);
	let closeDropdown = dropdown.close;
	$effect(() => {
		// this can be done adding nav.navStatus directly to DOM element
		// without using effect
		dropdownStatus = dropdown.isOpen;
	});
	let transitionParams = {
		y: -8,
		duration: 100,
		easing: sineIn
	};

	const drawer = $filesDrawer;

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

	function openFilesDrawer() {
		closeDropdown();
		drawer.open();
	}
</script>

<Tooltip
  color="default"
  offset={6}
  triggeredBy="#add-component-button"
>
Add a component to the mixture
</Tooltip>

<div class="relative">
	<PlusOutline
		id="add-component-button"
		class="text-white cursor-pointer"
		onclick={() => (dropdown.isOpen ? dropdown.close() : dropdown.open())}
	/>

	{#if dropdownStatus}
		<Portal target="body">
			<button
				type="button"
				class="fixed inset-0 bg-transparent cursor-default"
				onclick={closeDropdown}
				aria-label="Close dropdown"
			></button>
		</Portal>

		<Dropdown
			{dropdownStatus}
			{closeDropdown}
			params={transitionParams}
			class="absolute left-0 bottom-full mb-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200"
		>
			<DropdownUl class="py-2">
				<DropdownLi aClass="flex hover:bg-gray-100">
					<button class="flex w-full px-4 py-2 items-center gap-2" onclick={addSpirit}>
						<CirclePlusSolid size="sm" /> <span>spirit</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex hover:bg-gray-100">
					<button class="flex w-full px-4 py-2 items-center gap-2" onclick={addSugar}>
						<CirclePlusSolid size="sm" /> <span>sweetener</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex hover:bg-gray-100">
					<button class="flex w-full px-4 py-2 items-center gap-2" onclick={addSyrup}>
						<CirclePlusSolid size="sm" /> <span>syrup</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex hover:bg-gray-100">
					<button class="flex w-full px-4 py-2 items-center gap-2" onclick={addWater}>
						<CirclePlusSolid size="sm" /> <span>water</span>
					</button>
				</DropdownLi>
				<DropdownLi aClass="flex hover:bg-gray-100">
					<button class="flex w-full px-4 py-2 items-center gap-2" onclick={openFilesDrawer}>
						<CirclePlusSolid size="sm" /> <span>saved mixture</span>
					</button>
				</DropdownLi>
			</DropdownUl>
		</Dropdown>
	{/if}
</div>
