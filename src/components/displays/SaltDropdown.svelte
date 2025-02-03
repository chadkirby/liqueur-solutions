<script lang="ts">
	import Dropdown from './Dropdown.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import type { SubstanceComponent } from '$lib/ingredients/substance-component.js';
	import { Salts, type SaltType } from '$lib/ingredients/substances.js';

	interface Props {
		componentId: string;
		component: SubstanceComponent;
		mixtureStore: MixtureStore;
		class?: string | string[];
		basis?: string;
		onclick?: (e: Event) => void;
	}

	let {
		componentId,
		component,
		mixtureStore,
		class: classProp,
		basis,
		onclick = () => {},
	}: Props = $props();

	let substanceId = $derived(component.substanceId);
</script>

<Dropdown
	{basis}
	class={classProp}
	{onclick}
	value={substanceId}
	onchange={(e) => {
		mixtureStore.updateSaltType(componentId, e.currentTarget.value as SaltType);
	}}
>
	{#each Salts as salt}
		<option value={salt.id} selected={salt.id === substanceId}>{salt.name}</option>
	{/each}
</Dropdown>
