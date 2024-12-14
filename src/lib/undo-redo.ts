import { type Updater } from 'svelte/store';
import pDebounce from 'p-debounce';

type UndoItem<T> = {
	desc: string;
	undos: Array<Updater<T>>;
	redos: Array<Updater<T>>;
};

function emptyItem<T>(desc: string): UndoItem<T> {
	return {
		desc,
		undos: [],
		redos: []
	};
}

class Collector<T> {
	private pending: UndoItem<T>;
	constructor(
		desc: string,
		private readonly committer: (item: UndoItem<T>) => void
	) {
		this.pending = emptyItem(desc);
	}

	public collect(desc: string, undo: Updater<T>, redo: Updater<T>) {
		if (this.pending.desc !== desc) {
			this.committer(this.pending);
			this.pending = emptyItem(desc);
		}
		this.pending.undos.push(undo);
		this.pending.redos.push(redo);
		this.commit();
	}

	private commit = pDebounce(() => {
		this.commitImmediately();
	}, 1000);

	commitImmediately() {
		if (this.pending.undos.length) this.committer(this.pending);
		this.pending = emptyItem(this.pending.desc);
	}
}

export class UndoRedo<T> {
	private undoStack = new Array<UndoItem<T>>();
	private redoStack = new Array<UndoItem<T>>();
	constructor(private readonly maxItems: number = 100) {}

	get undoLength() {
		return this.undoStack.length;
	}

	get redoLength() {
		return this.redoStack.length;
	}

	private collector: Collector<T> = new Collector('', (item) => {
		this.undoStack.push(item);
		// limit the number of items in the stack
		if (this.undoStack.length > this.maxItems) {
			this.undoStack.shift();
		}

		this.redoStack = [];
	});

	push(desc: string, undo: Updater<T>, redo: Updater<T>) {
		this.collector.collect(desc, undo, redo);
	}

	/**
	 * Commit any pending operations in the collector
	 * to the undo stack (public method for testing)
	 */
	_forceCommit() {
		this.collector.commitImmediately();
	}

	getUndo() {
		// flush any pending operations in the collector
		this._forceCommit();
		const item = this.undoStack.pop();
		if (item) {
			this.redoStack.push(item);
			return item.undos.slice();
		}
		return [];
	}

	getRedo() {
		// flush any pending operations in the collector
		this._forceCommit();
		const item = this.redoStack.pop();
		if (item) {
			this.undoStack.push(item);
			return item.redos.slice();
		}
		return [];
	}
}
