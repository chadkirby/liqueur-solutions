<script>
	import { page } from '$app/state';
	// log the error so we can see it in the cloudflare logs
	console.error(page.error);
</script>

<div class="error-container">
	<h1>Error: {page.error?.message}</h1>

	<a role="button" href="/new">Create a new mixture</a>
</div>

<style>
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 1rem;
		text-align: center;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
		color: #e74c3c;
		width: 100%;
	}

	a {
		padding: 0.5rem 1rem;
		background-color: #3498db;
		color: white;
		border-radius: 5px;
		text-decoration: none;
		margin-top: 1rem;
	}
</style>
