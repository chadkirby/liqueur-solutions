<script lang="ts">
  import { Button,  } from 'svelte-5-ui-lib';
  import { CloseCircleSolid,  } from 'flowbite-svelte-icons';
	import {  mixtureStore } from '$lib';

  interface Props {
    componentId: string;
  }

  let {
    componentId,
  }: Props = $props();

  function removeComponent(e: Event) {
    e.preventDefault();
    mixtureStore.removeComponent(componentId);
  }
</script>


<Button
  class="p-1"
  outline color="light"
  onclick={removeComponent}
>
  <CloseCircleSolid size="md" />
</Button>
