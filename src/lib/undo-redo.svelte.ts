import pDebounce from 'p-debounce';

type Updater<T> = (value: T) => T;

class UndoItem<T> {
	constructor(public readonly desc: string) {}
	undos = [] as Updater<T>[];
	redos = [] as Updater<T>[];
}

class Collector<T> {
	private pending: UndoItem<T>;
	constructor(
		desc: string,
		private readonly committer: (item: UndoItem<T>) => void
	) {
		this.pending = new UndoItem(desc);
	}

	public collect(desc: string, undo: Updater<T>, redo: Updater<T>) {
		if (this.pending.desc !== desc) {
			this.committer(this.pending);
			this.pending = new UndoItem(desc);
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
		this.pending = new UndoItem(this.pending.desc);
	}
}

export class UndoRedo<T> {
	private undoStack = $state(new Array<UndoItem<T>>());
	private redoStack = $state(new Array<UndoItem<T>>());
	public readonly undoLength = $derived(this.undoStack.length);
	public readonly redoLength = $derived(this.redoStack.length);

	constructor(private readonly maxItems: number = 100) {}

	private collector: Collector<T> = new Collector('', (item) => {
		if (item.undos.length) {
			this.undoStack.push(item);
			this.redoStack = [];
		}
		// limit the number of items in the stack
		if (this.undoStack.length > this.maxItems) {
			this.undoStack.shift();
		}
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
