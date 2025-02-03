<script lang="ts">
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';
	import type { ChangeEventHandler } from 'svelte/elements';

	interface Props {
		children: Snippet;
		class?: string | string[];
		basis?: string;
		value: string;
		onclick?: (e: Event) => void;
		onchange: ChangeEventHandler<HTMLSelectElement>;
	}

	let {
		children,
		value,
		class: classProp,
		basis = '',
		onclick = () => {},
		onchange,
	}: Props = $props();
</script>

<div class={['flex', 'flex-row', 'gap-1', 'relative', basis, classProp]}>
	<select
		class={['w-full', 'appearance-none', 'ls-rounded-box', 'leading-[18px]', 'pl-6', 'py-0.5']}
		{value}
		{onclick}
		{onchange}
	>
		{@render children()}
	</select>
	<ChevronDownOutline
		class="
			pointer-events-none
			absolute
			left-1 top-0.5 h-5 w-5 text-primary-500"
	/>
</div>
