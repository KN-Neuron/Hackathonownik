<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let text: string = 'Heroes of the brain 2025';

	let titleEl: HTMLHeadingElement | null = null;
	let pathEl: SVGPathElement | null = null;

	// Wave + SVG sizing
	let d = '';
	let amplitude = 34;
	let segments = 9;
	let underlineGap = 24;
	let wavePadding = 0;

	// Extra padding to avoid blur / glow clipping
	let glowPadding = 42; // vertical extra space above & below wave
	let svgWidth = 0;
	let viewBox = ''; // dynamic viewBox string

	let measuredWidth = 0;

	let resizeObserver: ResizeObserver | null = null;
	let rAF: number | null = null;
	let pending = false;

	// Footer / layout sizing
	let footerHeight = 0;
	let mainPaddingY = 0;

	function buildWavePath(w: number, segs: number, amp: number): string {
		if (w <= 0) return '';
		const segmentW = w / segs;
		const baseline = 0;
		let path = `M 0 ${baseline}`;
		for (let i = 0; i < segs; i++) {
			const xStart = i * segmentW;
			const xMid = xStart + segmentW / 2;
			const xEnd = xStart + segmentW;
			const dir = i % 2 === 0 ? 1 : -1;
			const yCtrl = baseline + dir * amp;
			path += ` Q ${xMid} ${yCtrl}, ${xEnd} ${baseline}`;
		}
		return path;
	}

	function updateLayoutMeasurements() {
		if (!browser) return;
		const footer = document.querySelector('footer');
		const main = document.querySelector('main.content-wrapper');
		if (footer) {
			footerHeight = footer.getBoundingClientRect().height;
			document.documentElement.style.setProperty('--footer-height', footerHeight + 'px');
		}
		if (main) {
			const styles = getComputedStyle(main);
			mainPaddingY =
				parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');
			document.documentElement.style.setProperty('--main-padding-y', mainPaddingY + 'px');
		}
	}

	function _updateImmediate() {
		if (!browser || !titleEl) return;
		updateLayoutMeasurements();

		const rect = titleEl.getBoundingClientRect();
		measuredWidth = rect.width;
		const waveWidth = measuredWidth + wavePadding * 2;
		svgWidth = waveWidth;

		// Expand vertical range to include blur/glow
		const vPad = amplitude + glowPadding;
		viewBox = `0 -${vPad} ${svgWidth} ${vPad * 2}`;

		d = buildWavePath(waveWidth, segments, amplitude);

		// Defer path length calc to next frame
		rAF = requestAnimationFrame(() => {
			if (!pathEl) return;
			pathEl.setAttribute('d', d);
			try {
				const len = pathEl.getTotalLength();
				pathEl.style.setProperty('--path-len', String(len));
			} catch {
				/* ignore */
			}
		});
	}

	function scheduleUpdate() {
		if (pending) return;
		pending = true;
		rAF = requestAnimationFrame(() => {
			pending = false;
			_updateImmediate();
		});
	}

	onMount(() => {
		if (!browser) return;

		// Initial sizing
		scheduleUpdate();

		// Observe title & root changes for responsive updates
		if ('ResizeObserver' in globalThis && titleEl) {
			resizeObserver = new ResizeObserver(scheduleUpdate);
			resizeObserver.observe(titleEl);
			resizeObserver.observe(document.documentElement);
		} else {
			window.addEventListener('resize', scheduleUpdate);
		}

		const orientationHandler = () => scheduleUpdate();
		window.addEventListener('orientationchange', orientationHandler);

		// Also recalc if fonts load late
		document.fonts?.ready?.then(() => scheduleUpdate());

		return () => {
			if (rAF) cancelAnimationFrame(rAF);
			if (resizeObserver) resizeObserver.disconnect();
			window.removeEventListener('orientationchange', orientationHandler);
			window.removeEventListener('resize', scheduleUpdate);
		};
	});

	onDestroy(() => {
		if (rAF) cancelAnimationFrame(rAF);
		resizeObserver?.disconnect();
	});

	// Manual refresh API
	export function refresh() {
		scheduleUpdate();
	}
</script>

<style>
	:root {
		--snake-duration: 7.5s;
		--snake-color-1: #ff6ec7;
		--snake-color-2: #7f7bff;
		--snake-color-3: #4df2ff;
	}

	/* Prevent scroll bars on this page */
	:global(html, body) {
		overflow: hidden;
	}

	.hero-stage {
		/* Exact viewport fit excluding footer + main vertical padding */
		min-height: calc(100vh - var(--footer-height, 0px) - var(--main-padding-y, 0px));
		height: calc(100vh - var(--footer-height, 0px) - var(--main-padding-y, 0px));
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: clamp(2rem, 4vh, 3.75rem);
		padding: 2rem 1.25rem;
		position: relative;
		/* Keep particles contained but allow internal SVG to render fully (we gave it padding in viewBox) */
		overflow: hidden;
		box-sizing: border-box;
	}

	.hero {
		font-size: clamp(2.8rem, 8vw, 5.8rem);
		font-weight: 800;
		font-family: 'Inter', system-ui, sans-serif;
		line-height: 1.02;
		text-align: center;
		margin: 0;
		background: linear-gradient(
			105deg,
			#ffffff 0%,
			#eaeaff 35%,
			#d9f6ff 55%,
			#ffffff 85%
		);
		-webkit-background-clip: text;
		color: transparent;
		filter: drop-shadow(0 4px 14px rgba(0,0,30,0.25));
		position: relative;
	}

	.hero::before {
		content: '';
		position: absolute;
		inset: -14% -18%;
		background:
			radial-gradient(circle at 35% 40%, rgba(110,156,255,0.25), transparent 60%),
			radial-gradient(circle at 70% 65%, rgba(255,140,230,0.22), transparent 62%);
		filter: blur(42px) saturate(140%);
		opacity: 0.8;
		z-index: -1;
		pointer-events: none;
	}

	.wave-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	svg.wave {
		overflow: visible;
		pointer-events: none;
		/* Slightly taller native box just in case */
		height: 180px;
		display: block;
	}

	.inner-wave {
		transform: translateY(var(--underline-gap));
	}

	path.snake {
		fill: none;
		stroke-width: 6;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke: url(#grad);
		--path-len: 1000;
		stroke-dasharray: var(--path-len);
		stroke-dashoffset: var(--path-len);
		animation:
			draw var(--snake-duration) cubic-bezier(.77,.22,.29,.84) infinite,
			glimmer 6.5s linear infinite,
			morph 9s ease-in-out infinite;
		filter:
			drop-shadow(0 0 10px rgba(160,220,255,0.55))
			drop-shadow(0 0 40px rgba(140,160,255,0.35))
			drop-shadow(0 0 65px rgba(140,160,255,0.18));
	}

	@keyframes draw {
		0% { stroke-dashoffset: var(--path-len); }
		28% { stroke-dashoffset: 0; }
		55% { stroke-dashoffset: 0; }
		100% { stroke-dashoffset: -var(--path-len); }
	}

	@keyframes glimmer {
		0% { filter: drop-shadow(0 0 8px rgba(110,180,255,0.35)) brightness(1); }
		50% { filter: drop-shadow(0 0 24px rgba(150,220,255,0.65)) brightness(1.25); }
		100% { filter: drop-shadow(0 0 8px rgba(110,180,255,0.35)) brightness(1); }
	}

	@keyframes morph {
		0%, 100% { transform: scaleY(1); }
		50% { transform: scaleY(1.08); }
	}

	.floating-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		mix-blend-mode: screen;
	}

	.floating-particles span {
		position: absolute;
		width: 10px;
		height: 10px;
		background: radial-gradient(circle, #ffffff, rgba(255,255,255,0) 70%);
		border-radius: 50%;
		animation: floatS 12s linear infinite;
		opacity: 0.5;
	}

	.floating-particles span:nth-child(2) { width: 14px; height: 14px; animation-duration: 15s; animation-delay: -4s; left: 18%; top: 68%; }
	.floating-particles span:nth-child(3) { width: 8px; animation-duration: 10s; animation-delay: -6s; left: 72%; top: 22%; }
	.floating-particles span:nth-child(4) { width: 12px; animation-duration: 17s; animation-delay: -2s; left: 55%; top: 75%; }
	.floating-particles span:nth-child(5) { width: 9px; animation-duration: 14s; animation-delay: -8s; left: 40%; top: 28%; }

	@keyframes floatS {
		0% { transform: translateY(0) translateX(0); opacity: 0; }
		10% { opacity: 0.6; }
		50% { transform: translateY(-40px) translateX(20px); opacity: 0.4; }
		90% { opacity: 0; }
		100% { transform: translateY(-80px) translateX(40px); opacity: 0; }
	}

	@media (max-width: 640px) {
		path.snake { stroke-width: 5; }
	}

	:global(body) {
		background:
			radial-gradient(circle at 70% 15%, #1d2340, #0e121f 60%),
			radial-gradient(circle at 15% 85%, #191f34, transparent 70%),
			#0f1322;
		color: #ffffff;
	}
</style>

<div class="hero-stage">
	<h1 class="hero" bind:this={titleEl}>
		{text}
	</h1>

	<div class="wave-wrapper" style="--underline-gap: {underlineGap}px">
		<svg
			class="wave"
			aria-hidden="true"
			{...{ width: svgWidth, viewBox }}
		>
			<defs>
				<linearGradient id="grad" x1="0%" y1="0%" x2="130%" y2="0%">
					<stop offset="0%" stop-color="var(--snake-color-1)" />
					<stop offset="38%" stop-color="var(--snake-color-2)" />
					<stop offset="75%" stop-color="var(--snake-color-3)" />
					<stop offset="100%" stop-color="var(--snake-color-1)" />
				</linearGradient>
				<!-- Generous filter region so glow is never clipped -->
				<filter id="softGlow" x="-50%" y="-120%" width="200%" height="300%">
					<feGaussianBlur stdDeviation="18" result="b" />
					<feMerge>
						<feMergeNode in="b" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<g class="inner-wave" filter="url(#softGlow)">
				<path
					bind:this={pathEl}
					class="snake"
					d={d}
					vector-effect="non-scaling-stroke"
				/>
			</g>
		</svg>
	</div>

	<div class="floating-particles" aria-hidden="true">
		<span></span><span></span><span></span><span></span><span></span>
	</div>
</div>
