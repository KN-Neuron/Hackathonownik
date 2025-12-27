<script>
    import { page } from '$app/stores';
</script>

<footer>
	<p>&copy; {$page.data.eventConfig.year} {$page.data.eventConfig.organizer}</p>
</footer>

<style>
	footer {
		display: flex;
		justify-content: center;
		background-color: black;
		color: white;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	p {
		padding: 10px;
		text-align: center;
		font-size: 0.8rem;
	}

	@media (max-width: 768px) {
		footer {
			padding: 0.5rem;
		}

		p {
			font-size: 0.7rem;
			padding: 8px 5px;
		}
	}
</style>
