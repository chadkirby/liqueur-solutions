<!-- NumberSpinner.svelte -->
<script lang="ts">
	import { digitsForDisplay } from '$lib';

	interface Props {
		value: number;
		min?: number;
		max?: number;
		format?: (value: number) => string;
		onValueChange?: (value: number) => void;
	}

	let {
		value,
		min = 0,
		max = Infinity,
		format = (v: number) => v.toString(),
		onValueChange
	}: Props = $props();

	// Internal state
	let touchStartY = $state(0);
	let isKeyboardEditing = $state(false);
	let touchStartTime = $state(0);
	let rawInputValue = $state('');
	let input: HTMLInputElement;

	// Handle keyboard input
	function handleKeyDown(event: KeyboardEvent) {
		if (isKeyboardEditing && (event.key === 'Enter' || event.key === 'Escape')) {
			event.preventDefault();
			if (event.key === 'Enter') {
				const newValue = Number(rawInputValue);
				if (!isNaN(newValue)) {
					setValue(newValue);
				}
			}
			finishEditing();
		}

		if (event.key === 'ArrowUp') {
			if (isKeyboardEditing) finishEditing();
			event.preventDefault();
			incrementValue();
		} else if (event.key === 'ArrowDown') {
			if (isKeyboardEditing) finishEditing();
			event.preventDefault();
			decrementValue();
		} else if (event.key === 'Tab') {
			if (isKeyboardEditing) finishEditing();
		} else if (
			!isKeyboardEditing &&
			(event.key === 'ArrowRight' || event.key === 'ArrowLeft' || /^[\d.]$/.test(event.key))
		) {
			// enter keyboard editing mode
			handleFocus();
		}
	}

	// Handle focus/blur for keyboard editing mode
	function handleFocus() {
		isKeyboardEditing = true;
		rawInputValue = value.toString();
	}

	function handleBlur() {
		finishEditing();
	}

	function finishEditing() {
		isKeyboardEditing = false;
		rawInputValue = '';
	}

	// Handle direct input
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (isKeyboardEditing) {
			rawInputValue = target.value;
			const newValue = Number(target.value);
			if (!isNaN(newValue)) {
				// Update the value but keep editing
				setValue(newValue);
			}
		} else {
			const newValue = Number(target.value);
			if (!isNaN(newValue)) {
				setValue(newValue);
			}
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
				input.focus();
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
			onValueChange?.(clampedValue);
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
			input.value = format(value);
		}
	});
</script>

<div class="flex items-center">
	<input
		bind:this={input}
		type="text"
		value={isKeyboardEditing ? rawInputValue : format(value)}
		oninput={handleInput}
		onkeydown={handleKeyDown}
		use:touchHandler
		onfocus={handleFocus}
		onblur={handleBlur}
		class="
				w-20 px-1 py-1
				border border-gray-300 rounded-lg
				focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				text-center
				text-base
				touch-none
		"
	/>
</div>
