<script>
    import { page } from '$app/stores';
</script>

<svg width="auto" height="30">
	<text x="0" y="20" class="text-gray-500 text-xl font-bold">{$page.data.eventConfig.organizer}</text>
</svg>

<style>
	text {
		fill: currentColor;
	}
</style>
