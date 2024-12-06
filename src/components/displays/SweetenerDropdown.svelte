<script lang="ts">
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import { Mixture, mixtureStore, Sweetener, SweetenerTypes } from '$lib';

	interface Props {
		componentId: string;
		component: Sweetener | Mixture;
		class?: string;
		basis: string;
		onclick?: (e: Event) => void;
	}

	let { componentId, component, class: classProp, basis, onclick = () => {} }: Props = $props();

	const sweeteners = SweetenerTypes.map((type) => ({ value: type, name: type }));

	let subType = $state(
		component instanceof Sweetener
			? component.subType
			: component.findByType((x) => x instanceof Sweetener)!.subType
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
			bind:value={subType}
			{onclick}
			onchange={(e) =>
				mixtureStore.updateSweetenerSubType(componentId, e.currentTarget.value as SweetenerTypes)}
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
