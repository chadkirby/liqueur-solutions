<script lang="ts">
	import { Mixture, mixtureStore, newSpirit, newSyrup, Sweetener, Water } from '$lib';
	import { CirclePlusSolid } from 'flowbite-svelte-icons';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import Button from '../ui-primitives/Button.svelte';

	let { componentId, callback }: { componentId: string | null; callback?: () => void } = $props();

	function addSpirit() {
		if (callback) callback();
		mixtureStore.addComponentTo(componentId, { name: 'spirit', component: newSpirit(100, 40) });
	}
	function addWater() {
		if (callback) callback();
		mixtureStore.addComponentTo(componentId, { name: 'water', component: new Water(100) });
	}
	function addSugar() {
		if (callback) callback();
		mixtureStore.addComponentTo(componentId, {
			name: 'sugar',
			component: new Sweetener('sucrose', 100)
		});
	}
	function addSyrup() {
		if (callback) callback();
		mixtureStore.addComponentTo(componentId, {
			name: 'simple syrup',
			component: newSyrup(100, 50)
		});
	}

	function addEmpty() {
		if (callback) callback();
		mixtureStore.addComponentTo(componentId, { name: 'mixture', component: new Mixture([]) });
	}

	function openFilesDrawer() {
		filesDrawer.openWith(componentId);
		if (callback) callback();
	}
</script>

<div class="flex flex-row flex-wrap gap-2">
	<Button class="p-1" onclick={addSpirit}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">spirit</span>
	</Button>

	<Button class="p-1" onclick={addSugar}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">sweetener</span>
	</Button>

	<Button class="p-1" onclick={addSyrup}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">syrup</span>
	</Button>

	<Button class="p-1" onclick={addWater}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">water</span>
	</Button>

	{#if componentId === null}
		<Button class="p-1" onclick={addEmpty}>
			<CirclePlusSolid size="sm" /> <span class="mx-1">empty mixture</span>
		</Button>

		<Button class="p-1" onclick={openFilesDrawer}>
			<CirclePlusSolid size="sm" /> <span class="mx-1">saved mixture</span>
		</Button>
	{/if}
</div>
