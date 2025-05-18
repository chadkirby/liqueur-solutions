<script lang="ts" module>
	import Cal from './displays/Cal.svelte';
	import BrixDetails from './displays/BrixDetails.svelte';
	import type { MixtureStore } from '$lib/mixture-store.svelte.js';
	import MassDetails from './displays/MassDetails.svelte';
	import VolumeDetails from './displays/VolumeDetails.svelte';
	import { isEmptyMixture, Mixture } from '$lib/mixture.js';
	import PhDetails from './displays/PHDetails.svelte';
	import AbvDetails from './displays/AbvDetails.svelte';
	import { isAcidId, isSweetenerId } from '$lib/ingredients/substances.js';

	export { mixtureTotals, ingredientTotals };
</script>

{#snippet mixtureTotals(mixtureStore: MixtureStore, mixture: Mixture)}
	{@const id = mixture.id}
	{@const mass = mixture.mass}
	{@const volume = mixture.volume}
	{@const className = 'w-24 shrink-0'}
	<!-- TOTALS -->
	<VolumeDetails {mixtureStore} ingredientId={id} component={mixture} {volume} class={className} />
	<MassDetails {mixtureStore} ingredientId={id} ingredientItem={mixture} {mass} class={className} />
	{#if mixture.eachSubstance().some(({ substanceId }) => substanceId === 'ethanol')}
		<AbvDetails
			{mixtureStore}
			ingredientId={id}
			ingredientItem={mixture}
			{mass}
			class={className}
		/>
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isSweetenerId(substanceId))}
		<BrixDetails
			{mixtureStore}
			ingredientId={id}
			ingredientItem={mixture}
			{mass}
			class={className}
		/>
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isAcidId(substanceId))}
		<PhDetails {mixtureStore} ingredientId={id} ingredientItem={mixture} {mass} class={className} />
	{/if}
	<Cal {mixtureStore} ingredientId={id} ingredientItem={mixture} {mass} class={className} />
{/snippet}

{#snippet ingredientTotals(
	mixtureStore: MixtureStore,
	mixture: Mixture,
	parentId: string,
	className = 'w-24 shrink-0',
)}
	{@const isEmpty = isEmptyMixture(mixture)}
	{@const id = mixture.id}
	{@const mass = isEmpty ? 0 : mixtureStore.get('mass', id)}
	{@const volume = isEmpty ? 0 : mixtureStore.get('volume', id)}
	<!-- TOTALS -->
	<VolumeDetails
		{mixtureStore}
		ingredientId={id}
		component={mixture}
		{volume}
		class={className}
		readonly={true}
	/>
	<MassDetails
		{mixtureStore}
		ingredientId={id}
		ingredientItem={mixture}
		{mass}
		class={className}
		readonly={true}
	/>
	{#if mixture.eachSubstance().some(({ substanceId }) => substanceId === 'ethanol')}
		<AbvDetails
			{mixtureStore}
			ingredientId={id}
			ingredientItem={mixture}
			{mass}
			class={className}
			readonly={true}
		/>
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isSweetenerId(substanceId))}
		<BrixDetails
			{mixtureStore}
			ingredientId={id}
			ingredientItem={mixture}
			{mass}
			class={className}
			readonly={true}
		/>
	{/if}
	{#if mixture.eachSubstance().some(({ substanceId }) => isAcidId(substanceId))}
		<PhDetails
			{mixtureStore}
			ingredientId={id}
			ingredientItem={mixture}
			{mass}
			class={className}
			readonly={true}
		/>
	{/if}
	<Cal
		{mixtureStore}
		ingredientId={id}
		ingredientItem={mixture}
		{mass}
		class={className}
		readonly={true}
	/>
{/snippet}
