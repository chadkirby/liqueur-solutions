<script lang="ts">
	import {
		mixtureStore,
		type SerializedComponent
	} from '$lib';
	import MixtureList from '../../components/MixtureList.svelte';
	import BottomNav from '../../components/BottomNav.svelte';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { liqueur: string; components: SerializedComponent[] };
	}

	let { data }: Props = $props();

	// Initialize the store with the data from the load function
	mixtureStore.deserialize(data);

</script>

<div class="mixtures-page max-w-lg mx-auto">
	<MixtureList />
  <BottomNav />
</div>

<style>
	.mixtures-page {
		padding: 1rem;
	}
</style>
