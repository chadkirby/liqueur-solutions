<script lang="ts">
  import { Button,  } from 'svelte-5-ui-lib';
  import { CloseCircleSolid,  } from 'flowbite-svelte-icons';
	import {  mixtureStore, type AnyComponent } from '$lib';

  interface Props {
    componentId: string;
  }

  let {
    componentId,
  }: Props = $props();
</script>


<Button
  pill={true}
  class="!p-1"
  color="gray"
  onclick={() => mixtureStore.removeComponent(componentId)}
>
  <CloseCircleSolid class="h-5 w-5"/>
</Button>
