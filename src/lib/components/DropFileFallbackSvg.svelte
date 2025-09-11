<script lang="ts">
	export let over: boolean = false;
</script>

<style>
	/* Ensure SVG overflow is visible so text that sits outside the 70×70 rect is not clipped */
	svg {
		display: block;
		overflow: visible;
	}

	/* Use currentColor pattern if you'd rather control the color from CSS; keep explicit fill/stroke in markup for now */
	.drop-rect { cursor: pointer; }

	/* Small responsive tweak: scale down font on very small containers */
	@media (max-width: 120px) {
		.text { font-size: 9px; }
	}
</style>

<svg
	width="80"
	height="100"
	viewBox="0 0 80 100"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-label="Drop PDF file area"
>
	<rect
		class="drop-rect"
		x="5"
		y="5"
		width="70"
		height="70"
		rx="10"
		stroke={over ? '#3B82F6' : '#9CA3AF'}
		stroke-width="2"
		stroke-dasharray={over ? '0' : '5 5'}
		fill="transparent"
	/>
	<path
		d="M40 25V55M40 55L30 45M40 55L50 45"
		stroke={over ? '#3B82F6' : '#9CA3AF'}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<!-- Multiline text using tspan so it is always visible and centered -->
	<text
		class="text"
		x="40"
		y="86"
		text-anchor="middle"
		fill={over ? '#3B82F6' : '#9CA3AF'}
		font-size="10"
	>
		<tspan x="40" dy="0">Drop PDF file here</tspan>
		<tspan x="40" dy="1.2em">or click to select</tspan>
	</text>
</svg>
