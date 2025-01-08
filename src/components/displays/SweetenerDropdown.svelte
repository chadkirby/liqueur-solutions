<script lang="ts">
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import type { IngredientItemComponent } from '$lib/mixture-types.js';
	import { sweetenerIds, type SweetenerType } from '$lib/ingredients/substances.js';

	interface Props {
		componentId: string;
		component: IngredientItemComponent;
		mixtureStore: MixtureStore;
		class?: string;
		basis: string;
		onclick?: (e: Event) => void;
	}

	let {
		componentId,
		mixtureStore,
		class: classProp,
		basis,
		onclick = () => {}
	}: Props = $props();

	const sweeteners = sweetenerIds.map((id) => ({ value: id, name: id }));

	let subType = $derived(
		mixtureStore.getSweetenerTypes(componentId).at(0) ?? ''
	);
</script>

<div class="w-full flex flex-row gap-1 relative {basis}">
	<select
		class="
			w-full
			appearance-none
			rounded-md border
			text-sm
			leading-[18px]
			border-primary-300
			bg-primary-50
			px-6 py-0.5
			{classProp}
			"
		value={subType}
		{onclick}
		onchange={(e) =>
			mixtureStore.updateSweetenerType(componentId, e.currentTarget.value as SweetenerType)}
	>
		{#each sweeteners as { value, name }}
			<option {value} selected={value === subType}>{name}</option>
		{/each}
	</select>
	<ChevronDownOutline
		class="
			pointer-events-none
			absolute
			left-1 top-0.5 h-5 w-5 text-primary-500"
	/>
</div>
