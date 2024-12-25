<script lang="ts">
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import Button from './ui-primitives/Button.svelte';
	import { CircleMinusSolid } from 'flowbite-svelte-icons';
	import { Tooltip } from 'svelte-5-ui-lib';

	interface Props {
		componentId: string;
		name: string;
		mixtureStore: MixtureStore;
		onRemove?: () => void;
	}

	let { componentId, name, mixtureStore, onRemove }: Props = $props();

	function removeComponent(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		mixtureStore.removeComponent(componentId);
		if (onRemove) onRemove();
	}
</script>

<Tooltip color="default" offset={6} triggeredBy={`#componentId-${componentId}-remove`}
	>Remove {name}</Tooltip
>
<Button class="h-4" id={`componentId-${componentId}-remove`} onclick={removeComponent}
	><CircleMinusSolid size="sm" /></Button
>
