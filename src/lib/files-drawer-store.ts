import { writable } from 'svelte/store';
import { uiHelpers } from 'svelte-5-ui-lib';

const drawer = uiHelpers();
export const filesDrawer = writable(drawer);
