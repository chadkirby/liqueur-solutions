<!-- NumberSpinner.svelte -->
<script lang="ts">
	import { mixtureStore } from '$lib';
	import { digitsForDisplay, format } from '$lib/utils.js';

	interface Props {
		value: number;
		id?: string;
		componentId: string;
		type: 'brix' | 'abv' | 'volume' | 'mass';
		min?: number;
		max?: number;
		class?: string;
	}

	let { value, type, id, componentId, min = 0, max = Infinity, class: classProp }: Props = $props();

	const maxVal = type === 'abv' || type === 'brix' ? 100 : Infinity;

	function changeValue(v: number): number {
		const getKey =
			`get${type.replace(/^\w/, (c) => c.toUpperCase()) as Capitalize<typeof type>}` as const;
		getKey satisfies keyof typeof mixtureStore;

		const setKey =
			`set${type.replace(/^\w/, (c) => c.toUpperCase()) as Capitalize<typeof type>}` as const;
		setKey satisfies keyof typeof mixtureStore;

		try {
			mixtureStore[setKey](componentId, v);
		} catch (e) {
			// can't always set the requested value
		}
		return mixtureStore[getKey](componentId);
	}

	const unit = type === 'volume' ? 'ml' : type === 'mass' ? 'g' : '%';

	// Internal state
	let touchStartY = $state(0);
	let isKeyboardEditing = $state(false);
	let touchStartTime = $state(0);
	let rawInputValue = $state('');
	let input: HTMLInputElement | null = $state(null);

	// Handle keyboard input
	function handleKeyDown(e: KeyboardEvent) {
		const { key, metaKey } = e;
		if (key === 'Enter' || key === 'Tab') {
			const newValue = Number((e.target as HTMLInputElement).value);
		if (!isNaN(newValue)) {
			// Update the value but keep editing
			setValue(newValue);
		}
		}
		if (key === 'Enter' || key === 'Escape' || key === 'Tab') {
			finishEditing();
			// Don't call handleBlur() - it will be called automatically by the browser
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
		rawInputValue = value.toFixed(digitsForDisplay(value, maxVal));
		// Select the entire input value
		setTimeout(() => input?.select(), 1);
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
	function handleChange(event: Event) {
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
			const newVal = changeValue(clampedValue);
			value = newVal;
			return newVal;
		}
		return value;
	}

	/**
	 * Increments the given number by a step size determined by its order
	 * of magnitude.
	 *
	 * @param value - The number to be incremented.
	 * @returns The incremented number.
	 */
	function increment(value: number) {
		const step = value * 0.01;
		const roundTo =
			step > 8
				? 10
				: step > 4
					? 5
					: step > 0.8
						? 1
						: step > 0.4
							? 0.5
							: step > 0.08
								? 0.1
								: 0.01;
		return Math.round((value + step) / roundTo) * roundTo;
	}
	function decrement(value: number) {
		const step = value * 0.01;
		const roundTo =
			step > 8
				? 10
				: step > 4
					? 5
					: step > 0.8
						? 1
						: step > 0.4
							? 0.5
							: step > 0.08
								? 0.1
								: 0.01;
		return Math.round((value - step) / roundTo) * roundTo;
	}

	// Display either the formatted value or raw input value based on editing state
	$effect(() => {
		if (input && !isKeyboardEditing) {
			input.value = format(value, { unit }).value;
		}
	});
</script>

<div {id} class="flex items-center whitespace-nowrap font-mono leading-[18px] {classProp}">
	<input
		bind:this={input}
		use:touchHandler
		inputmode="decimal"
		pattern="[0-9]*[.]?[0-9]*"
		value={rawInputValue}
		onchange={handleChange}
		onkeydown={handleKeyDown}
		onfocus={handleFocus}
		onblur={handleBlur}
		onclick={(e) => e.stopPropagation()}
		autocomplete="off"
		class="
				block
				w-full
				{isKeyboardEditing ? 'text-center' : 'text-right'}
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
				text-xs
				px-0.5
				py-0.5
				focus:ring-2
				focus:border-blue-200
				focus:ring-blue-200
			"
	/><span class="ml-0.5 text-xs">{unit}</span>
</div>
