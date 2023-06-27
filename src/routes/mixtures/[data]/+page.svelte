<script>
  import MixtureList from './MixtureList.svelte';
  export let data;
</script>

<div class="mixtures-page">
  <h1>Mixtures</h1>
  <MixtureList {data} />
</div>

<style>
  .mixtures-page {
    padding: 1rem;
  }
</style>
