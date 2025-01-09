<script lang="ts">
	import ClerkProvider from 'clerk-sveltekit/client/ClerkProvider.svelte';
	import { experimental__simple } from '@clerk/themes'
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

	import '../app.postcss';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<ClerkProvider
	publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
	appearance={{
		baseTheme: experimental__simple,
		userButton: {baseTheme: experimental__simple},
		signIn: {baseTheme: experimental__simple},
		signUp: {baseTheme: experimental__simple},
	}}
>
	{@render children?.()}
</ClerkProvider>
