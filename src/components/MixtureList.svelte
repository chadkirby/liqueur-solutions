<script lang="ts">
	import { Mixture as MixtureObject, Sugar as SugarObject, Water as WaterObject, Spirit as SpiritObject, type Component } from '../lib/solutions';
	import SpiritComponent from './Spirit.svelte';
	import SugarComponent from './Sugar.svelte';
    import WaterComponent from './Water.svelte';


	let mixtures = [
		{ name: 'spirit', mixture: new SpiritObject(100, 40) },
        { name: 'water', mixture: new WaterObject(100)},
        { name: 'sugar', mixture: new SugarObject(50)}
	] as const;

    let mixture = new MixtureObject(Object.fromEntries(mixtures.map(mixture => [mixture.name, mixture.mixture])));


    let analysis = mixture.analyze(1);
    function updateAnalysis() {
        analysis = mixture.analyze(1);
    }

	let newName = '';
	let newVolume = 0;
	let newAbv = 0;
	let newBrix = 0;

	// function addMixture() {}

	// function removeMixture(index: number) {
	// 	mixtures = mixtures.filter((_, i) => i !== index);
	// }
</script>

<div class="mixture-list">
	{#each mixtures as {name, mixture}, index (index)}
		<div class="mixture-item">
            {#if mixture instanceof SpiritObject}
            <SpiritComponent {name} {mixture} on:update={updateAnalysis} />
        {:else if mixture instanceof WaterObject}
            <WaterComponent {name} {mixture} on:update={updateAnalysis} />
        {:else if mixture instanceof SugarObject}
            <SugarComponent {name} {mixture} on:update={updateAnalysis} />
        {/if}
			<!-- <button on:click={() => removeMixture(index)}>Remove</button> -->
		</div>
	{/each}

    <div class="mixture-state">
        <h2>Totals</h2>
        <p>Volume: {analysis.volume}ml</p>
        <p>ABV: {analysis.abv}%</p>
        <p>Brix: {analysis.brix}</p>
        <p>Mass: {analysis.mass}g</p>
    </div>

	<!-- <div class="add-mixture">
		<input bind:value={newName} placeholder="Name" />
		<input type="number" bind:value={newVolume} placeholder="Volume" />
		<input type="number" bind:value={newAbv} placeholder="ABV" />
		<input type="number" bind:value={newBrix} placeholder="Brix" />
		<button on:click={addMixture}>Add Mixture</button>
	</div> -->
</div>

<style>
	.mixture-item {
		margin-bottom: 1rem;
	}
</style>
