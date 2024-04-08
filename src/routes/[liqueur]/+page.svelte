<script>
  import MixtureList from '../../components/MixtureList.svelte';
  import { mixtureStore } from '$lib';

  // This prop is populated with the returned data from the load function
  export let data;

  // Initialize the store with the data from the load function
  mixtureStore.addComponents(data.components);
</script>

<div class="mixtures-page max-w-lg">
  <MixtureList liqueurName={data.liqueur} />
</div>

<style>
  .mixtures-page {
    padding: 1rem;
  }
</style>
