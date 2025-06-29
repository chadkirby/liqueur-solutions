<script lang="ts">
	import { goto } from '$app/navigation';
	import { SubstanceComponent } from '$lib/ingredients/substance-component.js';
	import { newSpirit } from '$lib/mixture-factories.js';
	import { componentId, Mixture } from '$lib/mixture.js';
	import { insertFile } from '$lib/persistence.svelte.js';
	import { generateStorageId } from '$lib/storage-id.js';
	import { onMount } from 'svelte';

    onMount(async () => {
        const adjectives = ['Untitled', 'New', 'Delicious', 'Refreshing', 'Tasty', 'Boozy'];
        const nouns = ['Mixture', 'Solution', 'Blend', 'Beverage', 'Drink', 'Mix'];

        const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

        const spirit = newSpirit(500, 40);
        const mixture = new Mixture(componentId(), [
            { name: '', id: componentId(), item: spirit, mass: spirit.mass },
            { name: '', id: componentId(), item: SubstanceComponent.new('water'), mass: 200 },
            { name: '', id: componentId(), item: SubstanceComponent.new('sucrose'), mass: 80 },
        ]);

        const item = {
            id: generateStorageId(),
            name,
            mixture,
        } as const;

        await insertFile(item);
        goto(`/edit/${item.id}`);
    });
</script>

<p>Creating new mixture...</p>
