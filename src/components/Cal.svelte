<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	interface Props {
		storeId: string;
	}

	let { storeId }: Props = $props();
</script>

<div class="mx-1 grow">
	<NumberSpinner
	{storeId}
	valueType="kcal"
	readonly={true}
	label="kcal"
	suffix="kcal"
	/>
</div>
