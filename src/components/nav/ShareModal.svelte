<script lang="ts">
	import { Button, Modal, Toast } from 'svelte-5-ui-lib';
	import Portal from 'svelte-portal';
	import QRCode from '@castlenine/svelte-qrcode';
	import { MixtureStore } from '$lib/mixture-store.svelte.js';
	import { shareModal } from '$lib/share-modal-store.svelte';
	import { serializeToUrl } from '$lib/url-serialization.js';

	interface Props {
		mixtureStore: MixtureStore;
	}

	let { mixtureStore }: Props = $props();

	let downloadUrl = $state('');
	let toastStatus = $state(false);

	const copyUrlToClipboard = async () => {
		const url = serializeToUrl(mixtureStore.name, mixtureStore.mixture).toString();
		try {
			await navigator.clipboard.writeText(url);
			toastStatus = true;
			setTimeout(() => {
				toastStatus = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy URL to clipboard', error);
		}
	};

	// close the modal on escape
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			shareModal.close();
		}
	};

	$effect(() => {
		if (shareModal.isOpen) {
			window.addEventListener('keydown', handleKeyDown);
			return () => {
				window.removeEventListener('keydown', handleKeyDown);
			};
		}
	});

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

<Portal target="body">
	<Modal
		size="sm"
		modalStatus={shareModal.isOpen}
		closeModal={shareModal.close}
		data-testid="share-modal"
	>
		<div id="qr-code" class="flex flex-col content-center items-center gap-2">
			<QRCode
				data={serializeToUrl(mixtureStore.name, mixtureStore.mixture).toString()}
				size={256}
				downloadUrlFileFormat="png"
				dispatchDownloadUrl
				on:downloadUrlGenerated={(event) => handleDownloadUrlGenerated(event.detail.url)}
			/>
			<Toast bind:toastStatus position="top-left">Copied to clipboard</Toast>

			<div class="flex flex-row justify-center gap-2">
				<Button outline color="light" class="p-1" onclick={copyUrlToClipboard}>Copy URL</Button>
				<Button outline color="light" class="p-1" onclick={copyImage}>Copy QR Code</Button>
				{#if downloadUrl}
					<Button
						outline
						color="light"
						class="p-1"
						href={downloadUrl}
						download={(mixtureStore.name || 'my-mixture') + '.png'}>Download QR Code</Button
					>
				{/if}
			</div>
		</div>
	</Modal>
</Portal>
