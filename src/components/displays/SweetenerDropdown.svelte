<script lang="ts">
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import type { InMemoryIngredientItem } from '$lib/mixture-types.js';
	import { sweetenerIds, type SweetenerType } from '$lib/ingredients/substances.js';
	import Dropdown from './Dropdown.svelte';

	interface Props {
		componentId: string;
		component: InMemoryIngredientItem;
		mixtureStore: MixtureStore;
		class?: string;
		basis?: string;
		onclick?: (e: Event) => void;
	}

	let { componentId, mixtureStore, class: classProp, basis, onclick = () => {} }: Props = $props();

	const sweeteners = sweetenerIds.map((id) => ({ value: id, name: id }));

	let subType = $derived(mixtureStore.getSweetenerTypes(componentId).at(0) ?? '');
</script>

<Dropdown
	class={classProp}
	{basis}
	{onclick}
	value={subType}
	onchange={(e) => {
		mixtureStore.updateSweetenerType(componentId, e.currentTarget.value as SweetenerType);
	}}
>
	{#each sweeteners as { value, name }}
		<option {value} selected={value === subType}>{name}</option>
	{/each}
</Dropdown>
