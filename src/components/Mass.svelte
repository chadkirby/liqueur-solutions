<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let onInput: null | ((event: CustomEvent) => void);

	export let mass: number = 100; // grams
	let showDetails = false;
	let ounces: number;
	$: ounces = mass * 0.035274;
</script>

<div class="mx-1 grow">
	<NumberSpinner label="Mass" suffix="g" value={mass} {onInput} />
</div>
