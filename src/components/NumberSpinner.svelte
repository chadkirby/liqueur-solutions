<script lang="ts">
	// @ts-expect-error no types
	import NumberSpinner from 'svelte-number-spinner';
	import Textfield from '@smui/textfield';

	export let onInput: ((event: CustomEvent) => void) | null = null;
	export let value: number = 100;
	export let label: string;
	export let suffix: string;
	export let max = Infinity
	export let keyStep = 10;
	export let keyStepSlow = 1;
	export let keyStepFast = 100;
	let rounded: number;
	$: rounded = Number(value.toFixed(1));
	const id = Math.random().toString(36).substring(2);

	export let isLocked = false;

function toggleLock() {
	isLocked = !isLocked;
	const event = new CustomEvent('lock', {
		detail: {
			isLocked,
		},
	});
	onInput?.(event);
}

</script>

<div class="mx-1 relative">
	{#if onInput}
		<button class="absolute top-0 -right-2 scale-75 cursor-pointer z-10" on:click={() => toggleLock()}>
			&nbsp;
			{#if isLocked}
			<span class="material-icons mdc-fab__icon">
				lock
				</span>
			{:else}
			<span class="material-icons mdc-fab__icon">
				lock_open
				</span>
			{/if}
		</button>
	{/if}
	{#if onInput && !isLocked}
		<label
			for="volume-{id}"
			class="mdc-text-field smui-text-field--standard mdc-text-field--label-floating w-18"
			style=""
		>
		<span class="mdc-floating-label mdc-floating-label--float-above " style="">{label}</span>
		<NumberSpinner
			id="volume-{id}"
			class="mdc-text-field__input"
			value={rounded}
			on:input={onInput}
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
		<div class="mdc-line-ripple" style="" />
	</label>
	{:else}
		<Textfield
			class="w-18"
			bind:value={rounded}
			label={label}
			type="number"
			input$inputmode="numeric"
			suffix={suffix}
			invalid={value < 0}
			disabled={true}
		/>
	{/if}
</div>
