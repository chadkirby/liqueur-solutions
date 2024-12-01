<script lang="ts">
	import { format } from '$lib/utils.js';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import Helper from '../ui-primitives/Helper.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, class: classProp }: DisplayProps = $props();
	let value = $derived(component.kcal);
</script>

<div class="mx-1 grow {classProp}">
	<Helper>kcal</Helper>
	<ReadOnlyValue>{format(value)}</ReadOnlyValue>
</div>
