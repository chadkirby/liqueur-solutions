<script lang="ts">
	import Button from './Button.svelte';
    let { ...props } = $props();
</script>

<Button {...props}>Test</Button>
