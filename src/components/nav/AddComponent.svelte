<script lang="ts">
	import { mixtureStore, newSpirit, newSyrup, Sweetener, Water } from '$lib';
	import { CirclePlusSolid } from 'flowbite-svelte-icons';
	import { filesDrawer } from '$lib/files-drawer-store.svelte';
	import { Button } from 'svelte-5-ui-lib';

	let { componentId }: { componentId: string | null } = $props();

	function addSpirit() {
		mixtureStore.addComponentTo(componentId, { name: 'spirit', id: 'spirit', component: newSpirit(100, 40) });
	}
	function addWater() {
		mixtureStore.addComponentTo(componentId, { name: 'water', id: 'water', component: new Water(100) });
	}
	function addSugar() {
		mixtureStore.addComponentTo(componentId,
			{
				name: 'sugar',
				id: 'sweetener-sucrose',
				component: new Sweetener('sucrose', 100)
			}
		);
	}
	function addSyrup() {
		mixtureStore.addComponentTo(componentId,
			{ name: 'simple syrup', id: 'syrup', component: newSyrup(100, 50) }
		);
	}

	function openFilesDrawer() {
		filesDrawer.openWith(componentId);
	}
</script>

<div class="flex flex-row flex-wrap gap-2">
	<Button outline color="light" class="p-1" onclick={addSpirit}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">spirit</span>
	</Button>

	<Button outline color="light" class="p-1" onclick={addSugar}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">sweetener</span>
	</Button>

	<Button outline color="light" class="p-1" onclick={addSyrup}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">syrup</span>
	</Button>

	<Button outline color="light" class="p-1" onclick={addWater}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">water</span>
	</Button>

	<Button outline color="light" class="p-1" onclick={openFilesDrawer}>
		<CirclePlusSolid size="sm" /> <span class="mx-1">saved mixture</span>
	</Button>
</div>
