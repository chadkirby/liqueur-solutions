<script lang="ts">
	import { SignIn } from 'svelte-clerk';

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();
</script>

<div>
	<SignIn redirectUrl={data.next} />
</div>
