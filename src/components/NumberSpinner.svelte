<script lang="ts">
	// @ts-expect-error no types
	import NumberSpinner from 'svelte-number-spinner';
	import Textfield from '@smui/textfield';
	import {
		mixtureStore
	} from '$lib';

	export let onInput: ((event: CustomEvent) => number | undefined) | null = null;
	export let storeId: 'totals' | string; // static
	export let valueType: 'brix' | 'volume' | 'mass' | 'abv'; // static
	export let label: string;
	export let suffix: string;
	export let max = Infinity
	export let keyStep = 10;
	export let keyStepSlow = 1;
	export let keyStepFast = 100;

	const valueStore = mixtureStore.componentValueStore(storeId, valueType);
	const lockedStore = mixtureStore.lockedStore(storeId, valueType);

	let value: number;
  // Use a reactive statement to assign the value
  $: $valueStore; // This creates a subscription to the derived store
  $: value = $valueStore; // This will update whenever the derived store updates

	let isLocked: boolean;
	$: $lockedStore; // This creates a subscription to the derived store
	$: isLocked = $lockedStore; // This will update whenever the derived store updates

	let displayValue: number;
	let validState: boolean = value >= 0;

	// recompute displayValue when value changes
	$: displayValue = value, Number(value.toFixed(1));

	$: validState = value >= 0 && (requestedValue === null || roundEq(requestedValue, value));

	const id = Math.random().toString(36).substring(2);

	function toggleLock() {
		mixtureStore.toggleLock(storeId, valueType);
	}

	function reset() {
		if (requestedValue === null) return;
		value = requestedValue;
	}

	function doInput(event: CustomEvent) {
		if (isLocked) return;
		requestedValue = event.detail;
		if (event.detail === displayValue) return;
		requestedValue = event.detail;
		const newValue = onInput?.(event);
		if (newValue !== undefined) {
			value = newValue;
			console.log({label, requestedValue, newValue});
		}
	}

	function roundEq(a: number, b: number) {
		return Math.round(a) === Math.round(b);
	}

	const buttonClasses = "absolute top-0 -right-1 scale-75 cursor-pointer z-10";

</script>

<div class="mx-1 relative">
	{#if onInput}
		{#if isLocked}
			<button class={buttonClasses} on:click={() => toggleLock()}>
				<span class="material-icons mdc-fab__icon">lock</span>
			</button>
		{:else if validState}
			<button class={buttonClasses} on:click={() => toggleLock()}>
				<span class="material-icons mdc-fab__icon">lock_open</span>
			</button>
		{:else}
			<button class={buttonClasses} on:click={() => reset()}>
				<span class="material-icons mdc-fab__icon">refresh</span>
			</button>
		{/if}
	{/if}
	{#if onInput && !isLocked}
		<label
				for="volume-{id}"
				class="mdc-text-field smui-text-field--standard mdc-text-field--label-floating w-18 p-1 {validState ? "border-b border-slate-300" : "border-b-2 border-red-400 text-red-600"}"
			>
			<span class="mdc-floating-label mdc-floating-label--float-above " style="">{label}</span>
			<NumberSpinner
				id="volume-{id}"
				class="mdc-text-field__input"
				value={displayValue}
				on:input={doInput}
				min="0"
				max={max}
				step="1"
				decimals="0"
				editOnClick={true}
				vertical={true}
				horizontal={false}
				keyStep={keyStep}
				keyStepSlow={keyStepSlow}
				keyStepFast={keyStepFast}
			/>
			<span class="mdc-text-field__affix mdc-text-field__affix--suffix">{suffix}</span>
		</label>
	{:else}
		<Textfield
			class="w-18 p-1"
			bind:value={displayValue}
			label={label}
			type="number"
			input$inputmode="numeric"
			suffix={suffix}
			invalid={value < 0}
			disabled={true}
		/>
	{/if}
</div>

<style>
	:global(.mdc-text-field:not(.mdc-text-field--disabled) .mdc-text-field__input) {
    color: unset;
	}
</style>
