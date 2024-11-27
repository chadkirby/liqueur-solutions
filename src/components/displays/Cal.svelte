<script lang="ts">
	import { format } from '$lib/utils.js';
	import { Helper } from 'svelte-5-ui-lib';
	import ReadOnlyValue from '../ReadOnlyValue.svelte';
	import type { DisplayProps } from './display-props.js';

	let { component, class: classProp }: DisplayProps = $props();
	let value = $derived(component.kcal);
</script>

<div class="mx-1 grow {classProp}">
	<Helper>kcal</Helper>
	<ReadOnlyValue>{format(value)}</ReadOnlyValue>
</div>
