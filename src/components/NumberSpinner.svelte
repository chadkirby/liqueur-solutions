<script lang="ts">
	import { run } from 'svelte/legacy';

	// @ts-expect-error no types
	import SvNumberSpinner from 'svelte-number-spinner';
	import Textfield from '@smui/textfield';
	import {
		mixtureStore,
		Sweetener
	} from '$lib';
	import type { ComponentValueKey } from '$lib/mixture-store.js';
	import { BaseComponent, SweetenerTypes } from '$lib/component.js';

	interface Props {
		storeId: 'totals' | string; // static
		valueType: ComponentValueKey; // static
		readonly?: boolean;
		label: string;
		suffix: string;
		max?: any;
		keyStep?: number;
		keyStepSlow?: number;
		keyStepFast?: number;
		decimals?: number;
	}

	let {
		storeId,
		valueType,
		readonly = false,
		label,
		suffix,
		max = Infinity,
		keyStep = 10,
		keyStepSlow = 1,
		keyStepFast = 100,
		decimals = 0
	}: Props = $props();

	const secondaryValueType: 'mass' | 'volume' | 'proof' | 'equivalentSugarMass' | null =
		valueType === 'volume'
		? 'mass'
		: valueType === 'mass'
		? 'volume'
		: valueType === 'abv'
		? 'proof'
		: valueType === 'brix'
		? 'equivalentSugarMass'
		: null;

	const errorStore = mixtureStore.errorStore(storeId, valueType);

	let mixtureStoreData = $derived($mixtureStore); // Subscribe to mixtureStore directly

	let component: BaseComponent | null = $derived(storeId !== 'totals' && mixtureStoreData.mixture.components.find(c => c.id === storeId)?.component || null);
	

	let value: number = $derived((component ? component[valueType] : mixtureStoreData.totals[valueType]) ?? 0);
  

	let isLocked: boolean = $derived(component ? !component.canEdit(valueType) : false);

	

	let validState: boolean = $state(value >= 0);

	// This creates a subscription to the derived store
	run(() => {
		$errorStore;
	});
	// This will update whenever the derived store updates
	run(() => {
		validState = !$errorStore;
	});

	let canEdit: boolean = $derived(!readonly);
	

	let secondaryValue = $derived(secondaryValueType ? {
		value: component ? (component[secondaryValueType] ?? 0).toFixed(1) : mixtureStoreData.totals[secondaryValueType] ?? 0,
		unit: secondaryValueType === 'mass' ? 'g' : secondaryValueType === 'volume' ? 'ml' : secondaryValueType === 'equivalentSugarMass' ? '≍g sug' : 'proof'
	} : {value: 0, unit: ''});

	const id = Math.random().toString(36).substring(2);

	function reset() {
		mixtureStore.resetError(storeId, valueType);
	}

	let isFocused = false;

	function onFocus() {
		isFocused = true;
	}
	function onBlur() {
		isFocused = false;
	}

	function doInput(event: CustomEvent) {
		if (isLocked) return;
		if (event.detail === Number(value.toFixed(1))) return;
		if (!isFocused) return;
		switch (valueType) {
			case 'volume':
				mixtureStore.setVolume(storeId, event.detail);
				break;
			case 'mass':
				mixtureStore.setMass(storeId, event.detail);
				break;
			case 'brix':
				mixtureStore.setBrix(storeId, event.detail);
				break;
			case 'abv':
				mixtureStore.setAbv(storeId, event.detail);
				break;
		}
	}

	const buttonClasses = "absolute top-0 -right-1 scale-75 cursor-pointer z-10";

</script>

<div class="mx-1 relative">
	{#if canEdit}
		{#if validState}
		  <!-- {#if isTotals}
			<button class={buttonClasses} on:click={() => toggleLock()}>
				<span class="material-icons mdc-fab__icon">lock_open</span>
			</button>
			{/if} -->
		{:else}
			<button class={buttonClasses} onclick={() => reset()}>
				<span class="material-icons mdc-fab__icon">refresh</span>
			</button>
		{/if}
	{/if}
	{#if canEdit && !isLocked}
		<label
				for="{valueType}-{id}"
				class="mdc-text-field smui-text-field--standard mdc-text-field--label-floating w-18 p-1 {validState ? "border-b border-slate-300" : "border-b-2 border-red-400 text-red-600"}"
			>
			<span class="mdc-floating-label mdc-floating-label--float-above " style="">{label}</span>
			<SvNumberSpinner
				class="mdc-text-field__input"
				value={value.toFixed(1)}
				on:input={doInput}
				on:focus={onFocus}
				on:blur={onBlur}
				min="0"
				max={max}
				step="1"
				decimals={decimals}
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
			value={value.toFixed((valueType === 'mass' || valueType === 'volume') ? 1 : 0)}
			label={label}
			type="number"
			input$inputmode="numeric"
			suffix={suffix}
			invalid={value < 0}
			disabled={true}
		/>
	{/if}
</div>
<div>
	{#if secondaryValueType}
		<div class="secondary-value w-18 px-1 text-sm italic flex flex-row m-1 gap-x-2 justify-between">
			<span>{secondaryValue.value}</span> <span>{secondaryValue.unit}</span>
		</div>

	{/if}
</div>

<style>
	:global(.mdc-text-field:not(.mdc-text-field--disabled) .mdc-text-field__input) {
    color: unset;
	}

	.secondary-value {
		color: var(--screenGray);
	}
</style>
