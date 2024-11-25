<script lang="ts">
	import { mixtureStore, newSpirit, newSyrup, Sweetener, Water } from '$lib';
	import { CirclePlusSolid, PlusOutline } from 'flowbite-svelte-icons';
	import { Dropdown, DropdownLi, DropdownUl, Tooltip, uiHelpers } from 'svelte-5-ui-lib';
	import { sineIn } from 'svelte/easing';
	import Portal from 'svelte-portal';

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
		class="text-white"
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
			class="fixed -translate-y-[120%] -translate-x-4"
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
