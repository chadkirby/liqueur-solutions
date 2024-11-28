<script lang="ts">
	import { ButtonGroup, Input } from 'svelte-5-ui-lib';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import { Mixture, mixtureStore, Sweetener, SweetenerTypes } from '$lib';

	interface Props {
		componentId: string;
		name: string;
		component: Sweetener | Mixture;
	}

	let { componentId, component, name }: Props = $props();

	const sweeteners = SweetenerTypes.map((type) => ({ value: type, name: type }));

	let subType = $state(
		component instanceof Sweetener
			? component.subType
			: component.findByType((x) => x instanceof Sweetener)!.subType
	);
</script>

<div class="w-full flex flex-row gap-1 relative">
		<select
			class="
      w-full
      appearance-none
      rounded border
      border-gray-300
      bg-gray-50
      px-8 py-2
      pr-10
      "
			bind:value={subType}
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
      left-2 top-3 h-5 w-5 text-gray-500"
		/>
</div>
