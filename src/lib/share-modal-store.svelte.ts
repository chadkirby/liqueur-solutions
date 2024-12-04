let isOpen = $state(false);

export const shareModal = {
	get isOpen() {
		return isOpen;
	},
	set isOpen(value: boolean) {
		isOpen = value;
	},
	open() {
		isOpen = true;
	},
	close() {
		isOpen = false;
	},
	toggle() {
		isOpen = !isOpen;
	}
};
