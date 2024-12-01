<script lang="ts">
	// import Button from '../ui-primitives/Button.svelte';
	import { Button, Modal, uiHelpers, Toast, Tooltip } from 'svelte-5-ui-lib';
	import { ArrowUpFromBracketOutline } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import QRCode from '@castlenine/svelte-qrcode';
	import { mixtureStore } from '$lib';
	import { resolveUrl } from '$lib/local-storage.svelte';
	import { urlEncode } from '$lib/mixture-store.js';
	const modal = uiHelpers();
	let modalStatus = $state(false);
	$effect(() => {
		modalStatus = modal.isOpen;
	});
	const closeModal = modal.close;

	let downloadUrl = $state('');
	let toastStatus = $state(false);

  const copyUrlToClipboard = async () => {
		await navigator.clipboard.writeText(resolveUrl(urlEncode(mixtureStore.getName(), mixtureStore.getMixture())));
    toastStatus = true;
    setTimeout(() => {
      toastStatus = false;
    }, 2000);
	};


	const handleDownloadUrlGenerated = (url = '') => {
		downloadUrl = url;
	};

	const copyImage = async () => {
		const svg = document.querySelector('#qr-code svg');
		if (!svg) return;

		// Create a canvas with the same dimensions as the SVG
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const svgData = new XMLSerializer().serializeToString(svg);

		// Create an image and wait for it to load
		const svgImage = await new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(blob);

			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve(img);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject('Failed to load image');
			};
			img.src = url;
		});

		// Draw the image to canvas
		canvas.width = svgImage.width;
		canvas.height = svgImage.height;
		ctx?.drawImage(svgImage, 0, 0);

		// Convert to blob and copy to clipboard
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/png');
		});

		if (blob) {
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
		}
    toastStatus = true;
    setTimeout(() => {
      toastStatus = false;
    }, 2000);
	};
</script>

<Tooltip
  color="default"
  offset={6}
  triggeredBy="#share-button"
>
Share the current mixture
</Tooltip>
<ArrowUpFromBracketOutline id="share-button" class="text-white" onclick={modal.toggle} />

<Portal target="body">
	<Modal size="sm" {modalStatus} {closeModal}>
		<div id="qr-code" class="flex flex-col content-center items-center gap-2">
			<QRCode
				data={resolveUrl(urlEncode(mixtureStore.getName(), mixtureStore.getMixture()))}
				size={256}
				downloadUrlFileFormat="png"
				dispatchDownloadUrl
				on:downloadUrlGenerated={(event) => handleDownloadUrlGenerated(event.detail.url)}
			/>
				<Toast
          bind:toastStatus={toastStatus}
          position="top-left"
        >Copied to clipboard</Toast>

			<div class="flex flex-row justify-center gap-2">
				<Button outline color="light" class="p-1" onclick={copyUrlToClipboard}>Copy URL</Button>
				<Button outline color="light" class="p-1" onclick={copyImage}>Copy QR Code</Button>
				{#if downloadUrl}
					<Button outline color="light"
						class="p-1"
						href={downloadUrl}
						download={(mixtureStore.getName() || 'my-mixture') + '.png'}>Download QR Code</Button
					>
				{/if}
			</div>
		</div>
	</Modal>
</Portal>
