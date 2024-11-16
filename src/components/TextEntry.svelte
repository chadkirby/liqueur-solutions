<script lang="ts">
  import {  Input, ButtonGroup, Helper } from 'svelte-5-ui-lib';
  import {  ChevronDownOutline } from 'flowbite-svelte-icons';
	import { getLabel, mixtureStore, Sweetener, SweetenerTypes, type AnyComponent } from '$lib';
	import RemoveButton from './RemoveButton.svelte';

  interface Props {
    componentId: string;
    value: string;
    component: AnyComponent;
  }

  let {
    componentId,
    value = '',
    component,
  }: Props = $props();

  const sweeteners = SweetenerTypes.map((type) => ({ value: type, name: type }));


</script>


<div class="relative w-full">
  <Helper class="mt-2">{getLabel(component)}</Helper>
  <ButtonGroup class="w-full">
    {#if component instanceof Sweetener}
    <ChevronDownOutline class="pointer-events-none absolute left-2 top-3 h-5 w-5 text-gray-500"/>
    <select
      class="w-full appearance-none rounded border border-gray-300 px-8 py-2 pr-10"
      bind:value={component.subType}
      onchange={(e) => mixtureStore.updateSweetenerSubType(componentId, e.currentTarget.value as SweetenerTypes)}
      >
        {#each sweeteners as { value, name }}
          <option value={value} selected={value === component.subType}>{name}</option>
        {/each}
      </select>
      <RemoveButton componentId={componentId} />
    {:else}
      <Input
        bind:value
        class="w-full pr-8"
      />
      <RemoveButton componentId={componentId} />
    {/if}
  </ButtonGroup>
</div>
