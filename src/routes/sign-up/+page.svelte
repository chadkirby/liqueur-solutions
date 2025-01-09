<script lang="ts">
	import SignUp from 'clerk-sveltekit/client/SignUp.svelte'

	interface Props {
		// This prop is populated with the returned data from the load function
		data: { next: string };
	}

	let { data }: Props = $props();

</script>

<div>
	<SignUp redirectUrl={data.next} />
</div>
