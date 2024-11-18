<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Label } from 'svelte-5-ui-lib';
	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();
</script>

<Label
	class="
  w-20 px-1 py-1
  border border-gray-300 rounded-lg
  text-center
  text-slate-400
  text-base
  "
>
	{@render children()}
</Label>
