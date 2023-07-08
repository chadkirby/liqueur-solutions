<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let onInput: (event: CustomEvent) => void;
	export let abv: number = 40;
	let showDetails = false;
	let proof: number;
	$: proof = abv * 2;
</script>

<div class="mx-1">
	<NumberSpinner label="ABV" suffix="%" value={abv} max={100} {onInput} />
</div>
