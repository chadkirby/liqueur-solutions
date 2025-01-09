<script lang="ts">
	import SignOutButton from "clerk-sveltekit/client/SignOutButton.svelte";
	import UserProfile from "clerk-sveltekit/client/UserProfile.svelte";

</script>

<div class="p-8 flex justify-center items-start min-h-screen">
	<UserProfile />
	<SignOutButton />
</div>

<style>
</style>
