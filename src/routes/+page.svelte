<script>
	import AuthButtons from '../components/AuthButtons.svelte';
	function handleGetStarted() {
		window.location.href = '/new';
	}
	function handleLaunchApp() {
		window.location.href = '/new';
	}
</script>

<header class="fixed top-0 left-0 w-full bg-white/90 shadow z-30 backdrop-blur">
	<div class="max-w-5xl mx-auto flex justify-between items-center gap-3 py-3 px-6">
		<h1 class="text-xl font-semibold text-gray-800 tracking-tight">Liqueur Solutions</h1>
		<div class="flex gap-3">
			<button
				class="rounded-full w-28 py-1 text-center border border-primary-300 text-primary-900 font-medium text-sm bg-white hover:bg-primary-50 transition"
				on:click={handleLaunchApp}
			>
				Launch App
			</button>
			<AuthButtons />
		</div>
	</div>
</header>

<section
	class="landing-page flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-100"
>
	<div class="relative w-full max-w-3xl mx-auto pt-24 px-6">
		<div class="text-center p-10 rounded-xl shadow-xl bg-white/90 backdrop-blur-lg">
			<img
				src="/favicon.png"
				alt="App Logo"
				class="mx-auto mb-6 w-24 h-24 rounded-full border shadow-lg"
			/>
			<h1 class="text-5xl font-extrabold mb-4 text-gray-900 leading-tight">
				The Ultimate Cocktail Lab Calculator
			</h1>
			<p class="text-lg text-gray-700 mb-6 max-w-xl mx-auto">
				Ditch the spreadsheet. Perfect every cocktail, liqueur, and syrup with scientific precision.
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left mb-8">
				<div>
					<h2 class="text-xl font-semibold mb-2 text-gray-800">🔧 Key Features</h2>
					<ul class="list-disc list-inside text-gray-700 space-y-1">
						<li>ABV & dilution calculator</li>
						<li>pH estimator for acid/salt blends</li>
						<li>Sweetness calibration for natural & artificial sweeteners</li>
						<li>Scale & remix cocktail/liqueur recipes</li>
						<li>Share & publish creations</li>
					</ul>
				</div>
				<div>
					<h2 class="text-xl font-semibold mb-2 text-gray-800">🧪 Real-World Use Cases</h2>
					<ul class="list-disc list-inside text-gray-700 space-y-1">
						<li>Dilute 151 proof to 80 with confidence</li>
						<li>Match sweetness of 1:1 syrups with alternatives</li>
						<li>Dial in perfect 1:1, 2:1, or custom syrup ratios</li>
						<li>Scale super-juice & modernist techniques</li>
						<li>Balance pH, ABV, and sugar with lab-like accuracy</li>
					</ul>
				</div>
			</div>
			<button
				class="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition text-lg"
				on:click={handleGetStarted}
				aria-label="Get Started with Liqueur Solutions"
			>
				Get Started
			</button>
		</div>
	</div>
</section>

<style>
	.landing-page {
		min-height: 100vh;
	}
</style>
