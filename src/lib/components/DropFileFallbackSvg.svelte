<script lang="ts">
	export let over: boolean = false;
</script>

<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect
		x="5"
		y="5"
		width="70"
		height="70"
		rx="10"
		stroke={over ? '#3B82F6' : '#9CA3AF'}
		stroke-width="2"
		stroke-dasharray={over ? '0' : '5 5'}
	/>
	<path
		d="M40 25V55M40 55L30 45M40 55L50 45"
		stroke={over ? '#3B82F6' : '#9CA3AF'}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<text x="40" y="70" text-anchor="middle" fill={over ? '#3B82F6' : '#9CA3AF'} font-size="12">
		Drop PDF file here or click to select
	</text>
</svg>
