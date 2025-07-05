<script lang="ts">
	import Dropdown from './Dropdown.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import type { InMemoryIngredientItem } from '$lib/mixture-types.js';
	import {
		citrusJuiceNames,
		getCitrusPrefix,
		makeCitrusPrefix,
		type CitrusJuiceIdPrefix,
		type CitrusJuiceName,
	} from '$lib/ingredients/citrus-ids.js';

	interface Props {
		componentId: string;
		component: InMemoryIngredientItem;
		mixtureStore: MixtureStore;
		class?: string | string[];
		basis?: string;
		onclick?: (e: Event) => void;
	}

	let { componentId, mixtureStore, class: classProp, basis, onclick = () => {} }: Props = $props();

	let subType = $derived(getCitrusPrefix(componentId) ?? '');
</script>

<Dropdown
	{basis}
	class={classProp}
	{onclick}
	value={subType}
	onchange={(e) => {
		mixtureStore.updateCitrusType(componentId, e.currentTarget.value as CitrusJuiceIdPrefix);
	}}
>
	{#each citrusJuiceNames as name}
		{@const value = makeCitrusPrefix(name)}
		<option {value} selected={value === subType}>{name}</option>
	{/each}
</Dropdown>
