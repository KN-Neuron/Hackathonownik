<script>
    import PdfWorkspace from '$lib/components/pdf/PdfWorkspace.svelte';
    import HeaderText from '$lib/components/HeaderText.svelte';
    import { IconNames } from '$lib/utils/utils';

    let icon = IconNames.Upload;
    let text = 'PDF Upload & Preview';
</script>

<div>
    <HeaderText {icon} {text} />
    <PdfWorkspace />
</div>

<style>
    div {
        padding: 25px;
    }
</style>
