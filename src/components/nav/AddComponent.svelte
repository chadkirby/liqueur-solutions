<script lang="ts">
	import { Mixture } from '$lib/mixture.js';
	import { CirclePlusSolid } from 'flowbite-svelte-icons';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import Button from '../ui-primitives/Button.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { newSpirit, newSyrup, citrusFactory } from '$lib/mixture-factories.js';
	import { SubstanceComponent } from '$lib/ingredients/substance-component.js';
	import type { SubstanceId } from '$lib/ingredients/substances.js';
	import { makeCitrusId } from '$lib/ingredients/citrus-ids.js';

	let {
		componentId,
		callback,
		mixtureStore,
	}: { componentId: string | null; mixtureStore: MixtureStore; callback?: () => void } = $props();

	function addSpirit() {
		if (callback) callback();
		const spirit = newSpirit(100, 40);
		mixtureStore.addIngredientTo(componentId, { name: '', item: spirit, mass: spirit.mass });
	}
	function addWater() {
		if (callback) callback();
		mixtureStore.addIngredientTo(componentId, {
			name: '',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});
	}
	function addSugar() {
		if (callback) callback();
		mixtureStore.addIngredientTo(componentId, {
			name: '',
			item: SubstanceComponent.new('sucrose'),
			mass: 100,
		});
	}
	function addSyrup() {
		if (callback) callback();
		const syrup = newSyrup(100, 50);
		mixtureStore.addIngredientTo(componentId, {
			name: '',
			item: syrup,
			mass: syrup.mass,
		});
	}

	function addEmpty() {
		if (callback) callback();
		mixtureStore.addIngredientTo(componentId, { name: '', item: new Mixture(), mass: 0 });
	}

	function openFilesDrawer() {
		filesDrawer.openWith(componentId);
		if (callback) callback();
	}

	function addCitrus() {
		if (callback) callback();
		const juice = citrusFactory.lemon(100);
		mixtureStore.addIngredientTo(componentId, {
			name: 'lemon juice',
			id: makeCitrusId('lemon'),
			item: juice,
			mass: juice.mass,
		});
	}

	function addSubstance(substanceId: SubstanceId, mass = 1, name = '') {
		if (callback) callback();
		mixtureStore.addIngredientTo(componentId, {
			name,
			item: SubstanceComponent.new(substanceId),
			mass,
		});
	}
</script>

<div class="flex flex-row flex-wrap gap-1">
	<Button class="p-1" onclick={addSpirit} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">spirit</span>
	</Button>

	<Button class="p-1" onclick={addSugar} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">sweetener</span>
	</Button>

	<Button class="p-1" onclick={addSyrup} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">syrup</span>
	</Button>

	<Button class="p-1" onclick={addWater} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">water</span>
	</Button>

	<Button class="p-1" onclick={addCitrus} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">citrus juice</span>
	</Button>

	<Button class="p-1" onclick={() => addSubstance('sodium-citrate', 1)} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">salt</span>
	</Button>

	<Button class="p-1" onclick={() => addSubstance('citric-acid', 10)} data-testid="add-button">
		<CirclePlusSolid size="sm" /><span class="mr-1">acid</span>
	</Button>

	{#if componentId === null}
		<!-- <Button class="p-1" onclick={addEmpty}>
			<CirclePlusSolid size="sm" /><span class="mr-1">empty mixture</span>
		</Button> -->

		<Button class="p-1" onclick={openFilesDrawer} data-testid="add-button-saved">
			<CirclePlusSolid size="sm" /><span class="mr-1">saved mixture</span>
		</Button>
	{/if}
</div>
