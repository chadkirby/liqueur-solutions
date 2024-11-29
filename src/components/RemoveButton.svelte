<script lang="ts">
  import { Button } from 'svelte-5-ui-lib';
  import { CloseCircleSolid } from 'flowbite-svelte-icons';
  import { Tooltip } from 'svelte-5-ui-lib';
	import { mixtureStore } from '$lib';

  interface Props {
    componentId: string;
    name: string;
  }

  let {
    componentId,
    name
  }: Props = $props();

  function removeComponent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    mixtureStore.removeComponent(componentId);
  }
</script>

<Tooltip color="default" offset={6} triggeredBy={`#componentId-${componentId}-remove`}>Remove {name}</Tooltip>
<Button
  id={`componentId-${componentId}-remove`}
  class="p-1"
  outline color="light"
  onclick={removeComponent}
>
  <CloseCircleSolid size="sm" />
</Button>
