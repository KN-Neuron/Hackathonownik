<script>
	export let show = false;
	export let header = null;
	export let children = null;
	export let wide = false; 
	export let fullHeight = false; 
	export let fullScreen = false; 

	let dialog;

	$: if (show && dialog) {
		dialog.showModal();
		if (fullScreen) {
			document.body.style.overflow = 'hidden';
		}
	} else if (dialog && dialog.open) {
		dialog.close();
		document.body.style.overflow = '';
	}

	function handleClose() {
		show = false;
		document.body.style.overflow = '';
	}

	function handleClick(e) {
		// Close when clicking outside the modal content
		if (e.target === dialog) dialog.close();
	}

	// Enable ESC to close the modal
	function handleKeydown(e) {
		if (e.key === 'Escape' && dialog && dialog.open) {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog
	bind:this={dialog}
	on:close={() => (show = false)}
	on:click={handleClick}
	class:wide-modal={wide}
	class:full-height={fullHeight}
	class:full-screen={fullScreen}
>
	<div class="modal-content">
		{#if header && !fullScreen}
			<div class="modal-header">
				{#if typeof header === 'function'}
					{@render header()}
				{:else}
					{header}
				{/if}
			</div>
			<hr />
		{/if}

		<div class="modal-body">
			{#if typeof children === 'function'}
				{@render children()}
			{:else}
				{children}
			{/if}
		</div>

		{#if !fullScreen}
			<div class="modal-footer">
				<button autofocus type="button" class="close-btn" on:click={handleClose}>Close</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	dialog {
		max-width: 32em;
		border-radius: 10px;
		border: none;
		padding: 0;
		background-color: #1e1f22;
		color: #f0f0f0;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
		max-height: 90vh;
		overflow: hidden;
	}

	dialog.wide-modal {
		max-width: 800px;
		width: 95%;
	}

	dialog.full-height {
		height: 90vh;
		max-height: 90vh;
	}

		dialog.full-screen {
		width: 100vw;
		height: 100vh;
		max-width: 100vw;
		max-height: 100vh;
		border-radius: 0;
		padding: 0;
		margin: 0;
		top: 0;
		left: 0;
		transform: none;
		overflow: hidden;
		background-color: #000;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(3px);
	}

		dialog.full-screen::backdrop {
		background: #000;
	}

	.modal-content {
		padding: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
		max-height: inherit;
	}

	.modal-header {
		padding: 1.25rem 1.5rem;
		background-color: rgba(0, 0, 0, 0.15);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

		.full-screen .modal-body {
		padding: 0;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		display: flex;
		justify-content: flex-end;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background-color: rgba(0, 0, 0, 0.15);
	}

	hr {
		border: none;
		margin: 0;
	}

	.close-btn {
		padding: 0.5rem 1rem;
		background-color: #2c2e33;
		color: #f0f0f0;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #3b3f47;
	}

	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes zoom {
		from {
			transform: translate(-50%, -50%) scale(0.95);
			opacity: 0;
		}
		to {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
	}

		dialog.full-screen[open] {
		animation: fullScreenZoom 0.3s ease-out;
	}

	@keyframes fullScreenZoom {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
