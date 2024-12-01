<script lang="ts">
	let {
		value,
		type = 'text',
		class: classProp,
		id,
		...handlers
	}: {
		value: string;
		type?: 'text' | 'number';
		class?: string;
		id?: string;
		[key: `on${string}`]: (e: Event) => void;
	} = $props();
</script>

<input
	{type}
	{value}
	{id}
	autocomplete="off"
	class="
    block
    w-full
    rtl:text-right
    focus:outline-none
    border
    border-primary-300
    dark:border-primary-600
    dark:focus:border-primary-500
    dark:focus:ring-primary-50
    bg-primary-50
    text-primary-900
    dark:bg-primary-700
    dark:text-white
    dark:placeholder-primary-400
    rounded-md
    text-sm
    px-0.5
    py-1
    focus:ring-2
    focus:border-blue-200
    focus:ring-blue-200
    {classProp}
  "
	{...handlers}
/>

<style>
  /* Hide the spin buttons */
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield;
	}
</style>
