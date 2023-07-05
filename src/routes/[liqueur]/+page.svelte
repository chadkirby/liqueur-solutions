<script>
  import MixtureList from '../../components/MixtureList.svelte';
  export let data;
</script>

<div class="mixtures-page">
  <MixtureList {data} />
</div>

<style>
  .mixtures-page {
    padding: 1rem;
  }
</style>
