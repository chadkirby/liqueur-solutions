<script lang="ts">
  import MixtureList from '../../components/MixtureList.svelte';

  
  interface Props {
    // This prop is populated with the returned data from the load function
    data: any;
  }

  let { data }: Props = $props();

</script>

<div class="mixtures-page max-w-lg">
  <MixtureList {data} />
</div>

<style>
  .mixtures-page {
    padding: 1rem;
  }
</style>
