<script lang="ts">
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import type { SubstanceComponent } from '$lib/ingredients/substance-component.js';
	import { Acids, type AcidType } from '$lib/ingredients/substances.js';

	interface Props {
		componentId: string;
		component: SubstanceComponent;
		mixtureStore: MixtureStore;
		class?: string;
		basis: string;
		onclick?: (e: Event) => void;
	}

	let { componentId, component, mixtureStore, class: classProp, basis, onclick = () => {} }: Props = $props();

	let substanceId = $derived(component.substanceId);

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
			pl-6 py-0.5
			{classProp}
			"
		value={substanceId}
		{onclick}
		onchange={(e) =>
			mixtureStore.updateAcidType(componentId, e.currentTarget.value as AcidType)}
	>
		{#each Acids as acid}
			<option value={acid.id} selected={acid.id === substanceId}>{acid.name}</option>
		{/each}
	</select>
	<ChevronDownOutline
		class="
			pointer-events-none
			absolute
			left-1 top-0.5 h-5 w-5 text-primary-500"
	/>
</div>
