<!-- NumberSpinner.svelte -->
<script lang="ts">
	import { digitsForDisplay } from '$lib/utils.js';

	interface Props {
		value: number;
		set: (n: number) => number;
		increment: () => number;
		decrement: () => number;
		format: (n: number) => string;
		minMax?: { min: number; max: number };
		divId?: string;
		unitSuffix?: string;
		class?: string;
	}

	let {
		value,
		set,
		increment,
		decrement,
		format,
		minMax = { min: 0, max: Infinity },
		unitSuffix = '',
		divId,
		class: classProp,
	}: Props = $props();

	if (value === undefined) {
		throw new Error('Value is required');
	}

	function clamp(value: number) {
		return Math.min(minMax.max, Math.max(minMax.min, value));
	}
	// Internal state
	let touchStartY = $state(0);
	let isKeyboardEditing = $state(false);
	let touchStartTime = $state(0);
	let formattedValue = $derived(
		isKeyboardEditing
			? value.toFixed(digitsForDisplay(value, minMax.max))
			: format(value),
	);
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
			handleBlur();
			return;
		}
		if (key === 'Enter' || key === 'Escape' || key === 'Tab') {
			finishEditing();
			// Don't call handleBlur() - it will be called automatically by the browser
		} else if (key === 'ArrowUp') {
			if (isKeyboardEditing) finishEditing();
			e.preventDefault();
			value = increment();
		} else if (key === 'ArrowDown') {
			if (isKeyboardEditing) finishEditing();
			e.preventDefault();
			value = decrement();
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
		// Select the entire input value
		setTimeout(() => input?.select(), 1);
	}

	function handleBlur() {
		finishEditing();
		input?.blur();
	}

	function finishEditing() {
		isKeyboardEditing = false;
	}

	// Handle direct input
	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!/\d/.test(target.value)) return;

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
					value = increment();
				} else {
					value = decrement();
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
			},
		};
	}

	function setValue(newValue: number) {
		// Clamp the value between min and max
		const clampedValue = clamp(newValue);
		if (clampedValue !== value) {
			const newVal = changeValue(clampedValue);
			value = newVal;
			return newVal;
		}
		return value;
	}

	function changeValue(v: number): number {
		try {
			value = set(v);
		} catch (e) {
			// can't always set the requested value
		}
		return value;
	}

</script>

<div id={divId} class="flex items-center whitespace-nowrap font-mono leading-[18px] {classProp}">
	<input
		bind:this={input}
		use:touchHandler
		inputmode="decimal"
		pattern="[0-9]*[.]?[0-9]*"
		value={formattedValue}
		onchange={handleChange}
		onkeydown={handleKeyDown}
		onfocus={handleFocus}
		onblur={handleBlur}
		onclick={(e) => e.stopPropagation()}
		autocomplete="off"
		class="
				block
				w-full
				ls-rounded-box
				{isKeyboardEditing ? 'text-center' : 'text-right'}
			"
	/><span class="ml-0.5 text-xs w-5">{unitSuffix}</span>
</div>
