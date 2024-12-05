<!-- NumberSpinner.svelte -->
<script lang="ts">
	import { mixtureStore } from '$lib';
	import { digitsForDisplay, format } from '$lib/utils.js';

	interface Props {
		value: number;
		componentId: string;
		type: 'brix' | 'abv' | 'volume' | 'mass';
		min?: number;
		max?: number;
		class?: string;
	}

	let { value, type, componentId, min = 0, max = Infinity, class: classProp }: Props = $props();

	function changeValue(v: number) {
		if (type === 'brix') {
			mixtureStore.setBrix(componentId, v);
		} else if (type === 'abv') {
			mixtureStore.setAbv(componentId, v);
		} else if (type === 'volume') {
			mixtureStore.setVolume(componentId, v);
		} else if (type === 'mass') {
			mixtureStore.setMass(componentId, v);
		}
	}

	const unit = type === 'volume' ? 'ml' : type === 'mass' ? 'g' : type === 'abv' ? '%' : 'ºBx';

	// Internal state
	let touchStartY = $state(0);
	let isKeyboardEditing = $state(false);
	let touchStartTime = $state(0);
	let rawInputValue = $state('');
	let input: HTMLInputElement | null = $state(null);

	// Handle keyboard input
	function handleKeyDown(e: KeyboardEvent) {
		const { key, metaKey } = e;
		if (key === 'Enter' || key === 'Escape' || key === 'Tab') {
			handleBlur();
		} else if (key === 'ArrowUp') {
			if (isKeyboardEditing) finishEditing();
			e.preventDefault();
			incrementValue();
		} else if (key === 'ArrowDown') {
			if (isKeyboardEditing) finishEditing();
			e.preventDefault();
			decrementValue();
		} else if (!metaKey && /^[^\d.]$/.test(key)) {
			// ignore non-numeric keys
			e.preventDefault();
		} else if (!isKeyboardEditing) {
			// enter keyboard editing mode
			handleFocus(e);
		}
	}

	// Handle focus/blur for keyboard editing mode
	function handleFocus(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		isKeyboardEditing = true;
		rawInputValue = value.toString();
	}

	function handleBlur() {
		finishEditing();
		input?.blur();
	}

	function finishEditing() {
		isKeyboardEditing = false;
		rawInputValue = '';
	}

	// Handle direct input
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!/\d/.test(target.value)) return;

		if (isKeyboardEditing) {
			rawInputValue = target.value;
		}
		const newValue = Number(target.value);
		if (!isNaN(newValue)) {
			// Update the value but keep editing
			setValue(newValue);
		}
	}

	// Handle touch events
	// Define the action to handle touch events with passive: false
	function touchHandler(node: HTMLElement) {
		function start(event: TouchEvent) {
			event.preventDefault();
			touchStartY = event.touches[0].clientY;
			touchStartTime = Date.now();
		}

		function move(event: TouchEvent) {
			event.preventDefault();
			if (isKeyboardEditing) return;

			const touchY = event.touches[0].clientY;
			const diff = touchStartY - touchY;

			if (Math.abs(diff) > 10) {
				if (diff > 0) {
					incrementValue();
				} else {
					decrementValue();
				}
				touchStartY = touchY;
			}
		}

		function end(event: TouchEvent) {
			event.preventDefault();
			const touchDuration = Date.now() - touchStartTime;
			const touchMovement = Math.abs(event.changedTouches[0].clientY - touchStartY);

			if (touchDuration < 200 && touchMovement < 10) {
				isKeyboardEditing = true;
				rawInputValue = value.toString();
				input?.focus();
			}
		}

		node.addEventListener('touchstart', start, { passive: false });
		node.addEventListener('touchmove', move, { passive: false });
		node.addEventListener('touchend', end, { passive: false });
		return {
			destroy() {
				node.removeEventListener('touchstart', start);
				node.removeEventListener('touchmove', move);
				node.removeEventListener('touchend', end);
			}
		};
	}
	// Value manipulation functions
	function incrementValue() {
		setValue(increment(value));
	}

	function decrementValue() {
		setValue(decrement(value));
	}

	function setValue(newValue: number) {
		// Clamp the value between min and max
		const clampedValue = Math.max(min, Math.min(max, newValue));
		if (clampedValue !== value) {
			changeValue(clampedValue);
			value = clampedValue;
		}
	}

	/**
	 * Increments the given number by a step size determined by its order
	 * of magnitude.
	 *
	 * @param value - The number to be incremented.
	 * @returns The incremented number.
	 */
	function increment(value: number) {
		// how many digits to the left of the decimal point are shown for
		// this value?
		const digits = digitsForDisplay(value);
		// increment by the least significant that is shown
		const step = Math.max(1 / 10 ** digits);
		return value + step;
	}
	function decrement(value: number) {
		const digits = digitsForDisplay(value);
		const step = 1 / 10 ** digits;
		return value - step;
	}

	// Display either the formatted value or raw input value based on editing state
	$effect(() => {
		if (input && !isKeyboardEditing) {
			input.value = format(value).toString();
		}
	});
</script>

<div class="flex items-center whitespace-nowrap {classProp}">
	<input
		bind:this={input}
		use:touchHandler
		type="text"
		value={rawInputValue}
		oninput={handleInput}
		onkeydown={handleKeyDown}
		onfocus={handleFocus}
		onblur={handleBlur}
		onclick={(e) => e.stopPropagation()}
		autocomplete="off"
		class="
				block
				w-full
				text-right
				focus:outline-2
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
				py-0.5
				focus:ring-2
				focus:border-blue-200
				focus:ring-blue-200
			"
	/>&thinsp;<span class="unit">{unit}</span>
</div>

<style>
	span.unit {
		font-size: 0.8em;
	}
</style>
