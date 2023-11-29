<script lang="ts">
	import NumberSpinner from './NumberSpinner.svelte';
	export let onInput: null | ((event: CustomEvent) => void);
	export let abv: number = 40;
	export let isLocked: boolean = false;
	let showDetails = false;
	let proof: number;
	$: proof = abv * 2;
</script>

<div class="mx-1 grow">
	<NumberSpinner
		label="ABV"
		suffix="%"
		value={abv}
		max={100}
		{onInput}
		{isLocked}
		keyStep={1}
		keyStepFast={10}
		keyStepSlow={0.1}
	/>
</div>
