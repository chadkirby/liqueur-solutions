import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import Button from './Button.test.svelte';

test('Button', async () => {
	const user = userEvent.setup();
	let wasClicked = false;
	const onClick = () => {
		wasClicked = true;
	};
	let isActive = $state(false);
	render(Button, { id: 'foo', isActive, onclick: onClick });

	const button = screen.getByRole('button');
	expect(button.id).toBe('foo');
	expect(button).toHaveTextContent('Test');

	await user.click(button);

	expect(wasClicked).toBe(true);

	// const classList = [...button.classList];
	// isActive = true;
	// const activeList = [...button.classList];
	// expect(classList).not.toEqual(activeList);
});
