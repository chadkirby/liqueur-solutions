<script lang="ts">
	import { Input, ButtonGroup, Helper } from 'svelte-5-ui-lib';
	import { getLabel, type AnyComponent } from '$lib';
	import RemoveButton from './RemoveButton.svelte';

	interface Props {
		componentId: string;
		value: string;
		component: AnyComponent;
	}

	let { componentId, value = '', component }: Props = $props();
</script>

<div class="relative w-full">
	<Helper class="mt-2">{getLabel(component)}</Helper>
	<ButtonGroup class="w-full">
		<Input bind:value class="w-full pr-8" />
		<RemoveButton {componentId} />
	</ButtonGroup>
</div>
