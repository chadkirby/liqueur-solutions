<script lang="ts">
	import type { Snippet } from 'svelte';
	import Helper from './ui-primitives/Helper.svelte';
	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();
</script>

<Helper
	class="
  min-w-16 w-full px-1 py-1
  border border-slate-300 rounded-lg
  text-center
  text-slate-400
  text-base
  "
>
	{@render children()}
</Helper>
