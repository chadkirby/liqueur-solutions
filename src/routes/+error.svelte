<script>
	import { page } from '$app/stores';
    // log the error so we can see it in the cloudflare logs
    console.error($page.error);
</script>


<div class="error-container">
    <h1>Error: {$page.error?.message}</h1>
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
    }
</style>
