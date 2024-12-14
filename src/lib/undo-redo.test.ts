import { describe, it, expect } from 'vitest';
import { UndoRedo } from './undo-redo.js';

describe('UndoRedo', () => {
	it('should handle basic undo and redo operations', () => {
		const undoRedo = new UndoRedo<number>();
		let value = 0;

		undoRedo.push(
			'increment',
			(v) => v - 1, // undo
			(v) => v + 1 // redo
		);
		value++;

		const undos = undoRedo.getUndo();
		expect(undos).toHaveLength(1);
		value = undos[0](value);
		expect(value).toBe(0);

		const redos = undoRedo.getRedo();
		expect(redos).toHaveLength(1);
		value = redos[0](value);
		expect(value).toBe(1);
	});

	it('should collect multiple operations under the same description', () => {
		const undoRedo = new UndoRedo<number>();
		let value = 0;

		// Add multiple operations with the same description
		undoRedo.push(
			'batch operation',
			(v) => v - 1,
			(v) => v + 1
		);
		value++;

		undoRedo.push(
			'batch operation',
			(v) => v - 2,
			(v) => v + 2
		);
		value += 2;

		const undos = undoRedo.getUndo();
		expect(undos).toHaveLength(2);

		// Apply both undos
		value = undos[0](value);
		value = undos[1](value);
		expect(value).toBe(0);

		// Apply both redos
		const redos = undoRedo.getRedo();
		expect(redos).toHaveLength(2);
		value = redos[0](value);
		value = redos[1](value);
		expect(value).toBe(3);
	});

	it('should clear redo stack on new operations after undo', () => {
		const undoRedo = new UndoRedo<number>();
		let value = 0;

		// First operation
		undoRedo.push(
			'first',
			(v) => v - 1,
			(v) => v + 1
		);
		value++;

		// Undo the operation
		const undos = undoRedo.getUndo();
		value = undos[0](value);
		expect(value).toBe(0);

		// New operation should clear redo stack
		undoRedo.push(
			'second',
			(v) => v - 2,
			(v) => v + 2
		);
		value += 2;

		// Redo stack should be empty
		const redos = undoRedo.getRedo();
		expect(redos).toHaveLength(0);
	});

	it('should respect maximum stack size', () => {
		const undoRedo = new UndoRedo<number>();
		let value = 0;

		// Add more than 100 operations
		for (let i = 0; i < 110; i++) {
			undoRedo.push(
				`op${i}`,
				(v) => v - 1,
				(v) => v + 1
			);
			value++;
		}

		// Force immediate commit of any pending operations
		undoRedo._forceCommit(); // This calls commitImmediately internally

		// Count the actual operations in the stack
		expect(undoRedo.undoLength).toBe(100);
	});

	it('should return empty arrays when no operations are available', () => {
		const undoRedo = new UndoRedo<number>();

		const undos = undoRedo.getUndo();
		expect(undos).toHaveLength(0);

		const redos = undoRedo.getRedo();
		expect(redos).toHaveLength(0);
	});
});
