<script lang="ts">
	import { Modal, Button, uiHelpers, Toast } from 'svelte-5-ui-lib';
	import { ArrowUpFromBracketOutline } from 'flowbite-svelte-icons';
	import Portal from 'svelte-portal';
	import QRCode from '@castlenine/svelte-qrcode';
	import { mixtureStore } from '$lib';
	const modal = uiHelpers();
	let modalStatus = $state(false);
	const closeModal = modal.close;
	$effect(() => {
		modalStatus = modal.isOpen;
	});

	let downloadUrl = $state('');
	let toastStatus = $state(false);

  const copyUrlToClipboard = async () => {
		await navigator.clipboard.writeText(window.location.href);
    toastStatus = true;
	};


	const handleDownloadUrlGenerated = (url = '') => {
		downloadUrl = url;
	};

	const copyImage = async () => {
		const svg = document.querySelector('svg[height="256"][width="256"]');
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
	};
</script>

<ArrowUpFromBracketOutline class="text-white" onclick={modal.toggle} />

<Portal target="body">
	<Modal size="sm" {modalStatus} {closeModal}>
		<div class="flex flex-col content-center items-center gap-2">
			<QRCode
				data={window.location.href}
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
				<Button class="bg-secondary-600" onclick={copyUrlToClipboard}>Copy URL</Button>
				<Button class="bg-secondary-600" onclick={copyImage}>Copy QR Code</Button>
				{#if downloadUrl}
					<Button
						class="bg-secondary-600"
						href={downloadUrl}
						download={(mixtureStore.getTitle() || 'my-mixture') + '.png'}>Download QR Code</Button
					>
				{/if}
			</div>
		</div>
	</Modal>
</Portal>
