<script>
  import MixtureList from '../../components/MixtureList.svelte';

  // This prop is populated with the returned data from the load function
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
