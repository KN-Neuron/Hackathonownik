/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	plugins: [require('daisyui')],
	daisyui: {
		themes: ["dark"], // Use only dark theme
		darkTheme: "dark", // Name of the dark theme
		theme: "dark", // Default theme
	},
	theme: {
		extend: {}
	}
};