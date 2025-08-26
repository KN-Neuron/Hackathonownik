import Home from '$lib/components/icons/Home.svelte';
import Info from '$lib/components/icons/Info.svelte';
import Ranking from '$lib/components/icons/Ranking.svelte';
import Stats from '$lib/components/icons/Stats.svelte';

type ComponentMap = {
	[key: string]: typeof Home | typeof Info | typeof Stats;
};

export enum IconNames {
	Home = 'home',
	Info = 'info',
	Stats = 'stats',
	Ranking = 'ranking'
}

export const componentMap: ComponentMap = {
	[IconNames.Home]: Home,
	[IconNames.Info]: Info,
	[IconNames.Stats]: Stats,
	[IconNames.Ranking]: Ranking
};

export function getComponent(componentName: string) {
	const Component = componentMap[componentName];
	if (!Component) {
		throw new Error(`Component "${componentName}" not found.`);
	}
	return Component;
}
