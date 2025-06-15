<script>
	// You can add logic here if needed in the future
	function handleGetStarted() {
		window.location.href = '/new';
	}
</script>

<section
	class="landing-page flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-100"
>
	<div class="max-w-2xl text-center p-8 rounded-lg shadow-lg bg-white/80 mt-24">
		<img src="/favicon.png" alt="App Logo" class="mx-auto mb-6 w-20 h-20 rounded-full shadow" />
		<h1 class="text-4xl font-bold mb-4 text-gray-900">
			Liqueur Solutions: The Ultimate Recipe & Solution Calculator
		</h1>
		<p class="text-lg text-gray-700 mb-6">
			Unlock the science of cocktails, liqueurs, and syrups. Liqueur Solutions helps you calculate,
			create, and perfect recipes with professional precision—no spreadsheets required.
		</p>
		<div class="mb-6 text-left">
			<h2 class="text-2xl font-semibold mb-2 text-gray-800">
				What can you do with Liqueur Solutions?
			</h2>
			<ul class="list-disc list-inside text-gray-700 space-y-1">
				<li>Calculate ABV and volume for ethanol/water solutions</li>
				<li>Estimate pH for solutions with acids and salts</li>
				<li>Determine sweetness for natural and artificial sweeteners</li>
				<li>Mix, scale, and edit cocktail and liqueur recipes</li>
				<li>Share your creations online</li>
			</ul>
		</div>
		<div class="mb-6 text-left">
			<h2 class="text-2xl font-semibold mb-2 text-gray-800">Real-world use cases:</h2>
			<ul class="list-disc list-inside text-gray-700 space-y-1">
				<li>Figure out how much 151 proof spirit and water to combine for 80 proof</li>
				<li>Match the sweetness of 1:1 sucrose syrup using artificial sweeteners</li>
				<li>
					Make 1:1, 2:1, or custom-ratio simple syrups with precise water and sweetener amounts
				</li>
				<li>Calculate pH, ABV, sweetness, mass, and volume for any cocktail or liqueur</li>
				<li>Create and scale super-juice and modernist recipes</li>
				<li>Share, scale, and edit recipes for cocktails, liqueurs, and syrups</li>
			</ul>
		</div>
		<button
			class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
			on:click={handleGetStarted}
		>
			Get Started for Free
		</button>
	</div>
</section>

<style>
	.landing-page {
		min-height: 100vh;
	}
</style>
