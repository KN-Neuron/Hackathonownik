import Home from '$lib/components/icons/Home.svelte';
import Info from '$lib/components/icons/Info.svelte';
import Ranking from '$lib/components/icons/Ranking.svelte';
import Stats from '$lib/components/icons/Stats.svelte';
import Upload from '$lib/components/icons/Upload.svelte';
import Login from '$lib/components/icons/Login.svelte';
import Register from '$lib/components/icons/Register.svelte';

type ComponentMap = {
    [key: string]: typeof Home | typeof Info | typeof Stats;
};

export enum IconNames {
    Home = 'home',
    Info = 'info',
    Stats = 'stats',
    Ranking = 'ranking',
    Upload = 'upload',
    Login = 'login',
    Register = 'register'
}

export const componentMap: ComponentMap = {
    [IconNames.Home]: Home,
    [IconNames.Info]: Info,
    [IconNames.Stats]: Stats,
    [IconNames.Ranking]: Ranking,
    [IconNames.Upload]: Upload,
    [IconNames.Login]: Login,
    [IconNames.Register]: Register
};

export function getComponent(componentName: string) {
    const Component = componentMap[componentName];
    if (!Component) {
        throw new Error(`Component "${componentName}" not found.`);
    }
    return Component;
}
