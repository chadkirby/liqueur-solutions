<script lang="ts">
	import { ButtonGroup, Helper } from 'svelte-5-ui-lib';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import { getLabel, mixtureStore, Sweetener, SweetenerTypes } from '$lib';
	import RemoveButton from './RemoveButton.svelte';

	interface Props {
		componentId: string;
		component: Sweetener;
	}

	let { componentId, component }: Props = $props();

	const sweeteners = SweetenerTypes.map((type) => ({ value: type, name: type }));

	let subType = $state(component.subType);
</script>

<div class="w-full">
	<Helper>{getLabel(component)}</Helper>
	<ButtonGroup class="w-full relative">
		<ChevronDownOutline class="pointer-events-none absolute left-2 top-3 h-5 w-5 text-gray-500" />
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
		<RemoveButton {componentId} />
	</ButtonGroup>
</div>
