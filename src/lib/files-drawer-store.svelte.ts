import { uiHelpers } from 'svelte-5-ui-lib';

interface DrawerState {
	isOpen: boolean;
	parentId: string | null;
}

const state = $state<DrawerState>({
	isOpen: false,
	parentId: null
});

export const filesDrawer = {
	...uiHelpers(),
	get isOpen() {
		return state.isOpen;
	},
	set isOpen(value: boolean) {
		state.isOpen = value;
	},
	get parentId() {
		return state.parentId;
	},
	openWith(parentId: string | null) {
		state.parentId = parentId;
		state.isOpen = true;
	},
	close() {
		state.isOpen = false;
	}
};
