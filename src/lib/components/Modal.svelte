<script>
	let { show = $bindable(), header, children } = $props(); // Renamed showModal to show for simplicity; update bindings accordingly

	let dialog = $state(); // HTMLDialogElement

	$effect(() => {
		if (show) {
			dialog?.showModal(); // Added optional chaining to ensure dialog exists
		} else if (dialog?.open) {
			dialog.close(); // Added this for bidirectional control (closes if show is set to false externally)
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclose={() => (show = false)}
	onclick={(e) => {
		if (e.target === dialog) dialog.close();
	}}
>
	<div>
		{@render header?.()}
		<hr />
		{@render children?.()}
		<hr />
		<button autofocus onclick={() => dialog.close()}>Close</button>
		<!-- Uncommented and simplified for explicit closing -->
	</div>
</dialog>

<style>
	dialog {
		max-width: 32em;
		border-radius: 0.2em;
		border: none;
		padding: 0;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
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
	button {
		display: block;
	}
</style>
