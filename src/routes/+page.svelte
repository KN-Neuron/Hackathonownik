<script lang="ts">
	import '../app.css';
	import TeamRanking from '$lib/components/TeamRanking.svelte';
	import type { Team } from '$lib/interfaces/Team';
	import UploadFile from '$lib/components/UploadFile.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let isAuthenticated = $derived($page.data.user?.id);

	let teams: [Team] = [
		{
			teamName: 'neuron',
			rating: 2,
			notes: 'asdfdg'
		}
	];

	// --- Hero / Snake logic ---
	let titleEl: HTMLHeadingElement;
	let pathEl: SVGPathElement;
	let behindPathEl: SVGPathElement;
	let frontPathEl: SVGPathElement;

	let pathD = '';
	const amplitude = 42;          // vertical excursion of the snake
	const segments = 12;           // number of undulations
	const padding = 20;            // padding before/after text
	const baselineOffset = 0;      // adjust vertical baseline relative to text
	const strokeWidth = 8;

	function generateSnakePath(width: number, segs: number, amp: number): string {
		// We create a smooth sinus-like poly-bezier path
		const segmentWidth = width / segs;
		let d = `M 0 ${baselineOffset}`;
		for (let i = 0; i < segs; i++) {
			const x1 = segmentWidth * i + segmentWidth * 0.25;
			const x2 = segmentWidth * i + segmentWidth * 0.75;
			const x3 = segmentWidth * (i + 1);
			const dir = i % 2 === 0 ? -1 : 1; // alternate up/down
			const yCtrl = baselineOffset + dir * amp;
			d += ` C ${x1} ${baselineOffset}, ${x2} ${yCtrl}, ${x3} ${baselineOffset}`;
		}
		return d;
	}

	function fitPath() {
		if (!titleEl || !pathEl) return;
		const rect = titleEl.getBoundingClientRect();
		const width = rect.width + padding * 2;
		pathD = generateSnakePath(width, segments, amplitude);
		// update after tick
		requestAnimationFrame(() => {
			if (!pathEl) return;
			pathEl.setAttribute('d', pathD);
			behindPathEl?.setAttribute('d', pathD);
			frontPathEl?.setAttribute('d', pathD);
			// measure length to set CSS variable for animation
			const len = pathEl.getTotalLength();
			const root = pathEl.closest('.snake-wrapper') as HTMLElement;
			if (root) {
				root.style.setProperty('--path-length', `${len}`);
			}
		});
	}

	onMount(() => {
		fitPath();
		window.addEventListener('resize', fitPath);
		return () => window.removeEventListener('resize', fitPath);
	});
</script>

<style>
	:root {
		--snake-duration: 7s;
	}

	.hero-stage {
		min-height: 70vh;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		flex-direction: column;
		gap: 2rem;
	}

	.snake-wrapper {
		position: relative;
		display: inline-block;
		--path-length: 1000;
	}

	h1.hero {
		font-size: clamp(2.5rem, 6vw, 5.5rem);
		font-weight: 800;
		font-family: 'Inter', system-ui, sans-serif;
		line-height: 1;
		margin: 0;
		padding: 0 20px; /* match padding used in path width calc */
		position: relative;
		text-align: center;
		background: linear-gradient(120deg,#fff,#ddddff);
		-webkit-background-clip: text;
		color: #fff;
		text-shadow:
			0 0 6px rgba(255,255,255,0.15),
			0 2px 12px rgba(0,0,0,0.35);
	}

	/* Container for layering the SVG(s) */
	.snake-layer {
		position: absolute;
		left: 0;
		top: 100%;
		transform: translateY(-50%);
		overflow: visible;
		pointer-events: none;
	}

	/* We split front/behind concept using z-index + clipping.
	   Behind path sits below text; front shows only the "upper" arches. */
	.snake-layer.behind {
		z-index: 0;
		filter: drop-shadow(0 0 6px rgba(0,0,0,0.5));
		mix-blend-mode: screen;
	}

	.snake-layer.front {
		z-index: 2;
		/* Show only upper half => gives illusion of weaving (up=front, down=behind) */
		clip-path: inset(-40% -10% 50% -10%);
		mix-blend-mode: screen;
	}

	.hero-stage h1.hero {
		z-index: 1;
		position: relative;
	}

	.snake-path {
		fill: none;
		stroke-width: var(--stroke-width, 8);
		stroke-linecap: round;
		stroke-linejoin: round;
		/* initial dash so we can animate drawing + reversal */
		stroke-dasharray: var(--path-length) var(--path-length);
		animation:
			drawLine var(--snake-duration) ease-in-out infinite,
			hueShift 6s linear infinite;
	}

	/* Back layer slightly dimmer */
	.snake-path.behind {
		opacity: 0.55;
		filter: brightness(1.1) saturate(1.4);
	}

	/* Front layer brighter */
	.snake-path.front {
		opacity: 0.95;
		filter: brightness(1.4) saturate(2);
        filter: blur(20px);
	}

	/* Animated gradient stroke via stroke & gradientTransform animation */
	#rainbowGradient {
		animation: gradientMove 5s linear infinite;
	}

	@keyframes gradientMove {
		0% { gradientTransform: translateX(0); }
		50% { gradientTransform: translateX(50%); }
		100% { gradientTransform: translateX(0); }
	}

	@keyframes hueShift {
		0% { filter: hue-rotate(0deg); }
		50% { filter: hue-rotate(180deg); }
		100% { filter: hue-rotate(360deg); }
	}

	@keyframes drawLine {
		0% {
			stroke-dashoffset: var(--path-length);
		}
		35% {
			stroke-dashoffset: 0;
		}
		65% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: -var(--path-length);
		}
	}

	nav {
		text-align: center;
		margin-top: 2rem;
	}
</style>

<div class="hero-stage">
	<div class="snake-wrapper" style="--stroke-width: {strokeWidth}">

		<h1 class="hero" bind:this={titleEl}>
			Heroes of the brain 2025
		</h1>

		<!-- Behind layer SVG -->
		<svg class="snake-layer behind" height="{amplitude * 2}" style="width:100%;">
			<defs>
				<linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="200%" y2="0%">
					<stop offset="0%" stop-color="#ff0077"/>
					<stop offset="15%" stop-color="#ff8a00"/>
					<stop offset="30%" stop-color="#ffe600"/>
					<stop offset="45%" stop-color="#3bff00"/>
					<stop offset="60%" stop-color="#00ffd5"/>
					<stop offset="75%" stop-color="#0077ff"/>
					<stop offset="90%" stop-color="#9d00ff"/>
					<stop offset="100%" stop-color="#ff0077"/>
				</linearGradient>
			</defs>
			<path
				bind:this={behindPathEl}
				class="snake-path behind"
				stroke="url(#rainbowGradient)"
				d="{pathD}" />
		</svg>

		<!-- Front layer SVG (upper arches appear in front) -->
		<svg class="snake-layer front" height="{amplitude * 2}" style="width:100%;">
			<path
				bind:this={frontPathEl}
				class="snake-path front"
				stroke="url(#rainbowGradient)"
				d="{pathD}" />
		</svg>

		<!-- Hidden master path for measurement (optional if you want separate) -->
		<svg style="position:absolute; width:0; height:0; overflow:hidden;">
			<path bind:this={pathEl} d="{pathD}" />
		</svg>
	</div>

	<!-- Optional: Show team ranking below hero if logged in -->
	{#if $page.data.user}
		<div style="margin-top:1rem;">
			<TeamRanking {teams} />
		</div>
	{/if}
</div>

<nav>
	{#if !isAuthenticated}
		<a href="/login" class="btn">Login</a> |
		<a href="/register" class="btn">Register</a>
	{:else}
		<a href="/protected" class="btn">Protected Page</a> |
		<a href="/upload" class="btn">Upload</a> |
        <form method="get" action="/logout" style="display:inline">
			<button type="submit" class="btn">Logout</button>
		</form>
	{/if}
</nav>
