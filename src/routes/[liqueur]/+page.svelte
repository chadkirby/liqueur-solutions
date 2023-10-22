<script>
  import MixtureList from '../../components/MixtureList.svelte';
  export let data;
</script>

<div class="mixtures-page max-w-lg">
  <MixtureList {data} />
</div>

<style>
  .mixtures-page {
    padding: 1rem;
  }
</style>
