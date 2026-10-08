<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';
	import { checkinStatus } from '$lib/utils/checkin';
	import type { SubmissionItem } from '$lib/types';

	let { data } = $props();

	let icon = IconNames.Upload;
	let text = 'Submit Your Project';

	const deadline = new Date(data.eventConfig.deadline);
	const closed = new Date() > deadline;
	const formatDate = (d: string | Date) =>
		new Date(typeof d === 'string' ? d.replace(' ', 'T') : d).toLocaleString([], {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});

	let submission = $derived(data.submission);
	let required = $derived((data.required ?? []) as SubmissionItem[]);
	let doneCount = $derived(required.filter((item) => submission?.[item]).length);
	let allDone = $derived(required.length > 0 && doneCount === required.length);
	let checkin = $derived(
		checkinStatus(data.eventConfig.checkin_deadline, submission?.firstSubmittedAt)
	);

	// Per-card state: saving spinner and the server's answer
	let saving = $state<Record<string, boolean>>({});
	let messages = $state<Record<string, { ok: boolean; text: string }>>({});
	let repoLink = $state(data.submission?.repo?.url ?? '');
	let videoLink = $state(data.submission?.video?.url ?? '');
	let dragging = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let pdfForm: HTMLFormElement | undefined = $state();

	function submitter(item: SubmissionItem): SubmitFunction {
		return () => {
			saving[item] = true;
			delete messages[item];
			return async ({ result, update }) => {
				saving[item] = false;
				const payload = result.type === 'success' ? result.data : null;
				const ok = Boolean(payload?.success);
				messages[item] = {
					ok,
					text: ok ? 'Saved ✓' : (payload?.message as string) || 'Saving failed. Please try again.'
				};
				await update({ reset: false });
				// Show the link as stored (e.g. with https:// added)
				if (ok && item === 'repo') repoLink = data.submission?.repo?.url ?? repoLink;
				if (ok && item === 'video') videoLink = data.submission?.video?.url ?? videoLink;
			};
		};
	}

	// Choosing a file is enough: it uploads right away
	function uploadSelected(input = fileInput, form = pdfForm) {
		if (input?.files?.length) form?.requestSubmit();
	}

	function onDrop(event: DragEvent, input = fileInput, form = pdfForm) {
		event.preventDefault();
		dragging = false;
		finalDragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file || !input) return;
		const transfer = new DataTransfer();
		transfer.items.add(file);
		input.files = transfer.files;
		uploadSelected(input, form);
	}

	// The final presentation has its own, later deadline
	const finalDeadline = new Date(data.eventConfig.final_presentation_deadline);
	const finalClosed = new Date() > finalDeadline;
	let finalFileInput: HTMLInputElement | undefined = $state();
	let finalForm: HTMLFormElement | undefined = $state();
	let finalDragging = $state(false);

	const labels: Record<SubmissionItem, string> = {
		presentation: 'Presentation (PDF)',
		repo: 'Code repository link',
		video: 'Demo video link',
		final_presentation: 'Final presentation (PDF)'
	};
</script>

<div class="upload-page">
	<HeaderText {icon} {text} />

	{#if !data.hasTeam}
		<div class="alert alert-warning">
			You are not assigned to a team yet, so you can't submit. Ask the organizers on Discord.
		</div>
	{:else}
		<p class="team-line">
			Team <b>{data.teamName}</b> · deadline <b>{formatDate(deadline)}</b>
		</p>

		<!-- Check-in -->
		{#if checkin === 'open'}
			<div class="banner banner-checkin">
				<b>Check-in: add anything before {formatDate(data.eventConfig.checkin_deadline!)}</b>
				<span>Even just the repository link is enough. It tells us your team is competing.</span>
			</div>
		{:else if checkin === 'done'}
			<div class="banner banner-ok">✓ Your team is checked in.</div>
		{:else if checkin === 'missed'}
			<div class="banner banner-warn">
				Your team missed the check-in. You can still submit, but tell the organizers you are
				competing.
			</div>
		{/if}

		<!-- Overall progress -->
		<div class="progress-card" class:complete={allDone}>
			{#if allDone}
				<h2>🎉 All done! Your project is submitted.</h2>
				<p>
					You can still replace anything below until the deadline. The jury always sees the newest
					version.
				</p>
			{:else}
				<h2>{doneCount} of {required.length} done</h2>
				<p>
					Add the {required.length - doneCount === 1 ? 'missing item' : 'missing items'} below. Each
					one is saved on its own; teammates can add different parts.
				</p>
			{/if}
			<progress
				class="progress w-full {allDone ? 'progress-success' : 'progress-primary'}"
				value={doneCount}
				max={required.length || 1}
			></progress>
		</div>

		{#if closed && finalClosed}
			<div class="banner banner-warn">
				The submission deadline has passed ({formatDate(deadline)}). Nothing can be changed anymore.
			</div>
		{:else if closed}
			<div class="banner banner-warn">
				The deadline has passed ({formatDate(deadline)}). You can still upload the final
				presentation until {formatDate(finalDeadline)}.
			</div>
		{/if}

		<div class="submit-steps">
			<!-- 1. PDF -->
			<section class="submit-step" class:done={submission?.presentation} id="presentation_file">
				<div class="submit-step-header">
					<span class="submit-step-number">{submission?.presentation ? '✓' : '1'}</span>
					<div>
						<h3>
							{labels.presentation}
							{#if !required.includes('presentation')}<span class="optional">optional</span>{/if}
						</h3>
						{#if submission?.presentation}
							<p class="meta">
								<a href={submission.presentation.url} target="_blank" rel="noopener noreferrer"
									>Open current file</a
								>
								· added by {submission.presentation.submittedBy ?? 'a teammate'}, {formatDate(
									submission.presentation.at
								)}
							</p>
						{:else}
							<p class="meta">Export your slides as PDF (max 40 MB). Any file name is fine.</p>
						{/if}
					</div>
				</div>

				<form
					bind:this={pdfForm}
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					use:enhance={submitter('presentation')}
				>
					<input type="hidden" name="csrf_token" value={data.csrfToken} />
					<input
						bind:this={fileInput}
						id="pdf-input"
						type="file"
						name="file"
						accept="application/pdf,.pdf"
						class="hidden"
						disabled={closed || saving.presentation}
						onchange={() => uploadSelected()}
					/>
					<label
						for="pdf-input"
						class="dropzone"
						class:dragging
						class:disabled={closed}
						ondragover={(e) => {
							e.preventDefault();
							dragging = true;
						}}
						ondragleave={() => (dragging = false)}
						ondrop={(e) => onDrop(e)}
					>
						{#if saving.presentation}
							<span class="loading loading-spinner"></span> Uploading…
						{:else}
							<b>{submission?.presentation ? 'Replace the PDF' : 'Choose your PDF'}</b>
							<span>or drop it here – it uploads right away</span>
						{/if}
					</label>
				</form>
				{#if messages.presentation}
					<p class="message" class:error={!messages.presentation.ok}>
						{messages.presentation.text}
					</p>
				{/if}
			</section>

			<!-- 2. Repository -->
			<section class="submit-step" class:done={submission?.repo} id="repo_link">
				<div class="submit-step-header">
					<span class="submit-step-number">{submission?.repo ? '✓' : '2'}</span>
					<div>
						<h3>
							{labels.repo}
							{#if !required.includes('repo')}<span class="optional">optional</span>{/if}
						</h3>
						<p class="meta">
							{#if submission?.repo}
								Added by {submission.repo.submittedBy ?? 'a teammate'}, {formatDate(
									submission.repo.at
								)}
							{:else}
								GitHub or GitLab. Make sure the repository is public.
							{/if}
						</p>
					</div>
				</div>
				<form method="POST" action="?/upload" class="link-form" use:enhance={submitter('repo')}>
					<input type="hidden" name="csrf_token" value={data.csrfToken} />
					<input
						type="text"
						inputmode="url"
						name="repo_link"
						class="input input-bordered"
						placeholder="github.com/your-team/project"
						bind:value={repoLink}
						disabled={closed}
						required
					/>
					<button
						class="btn btn-primary"
						disabled={closed ||
							saving.repo ||
							!repoLink.trim() ||
							repoLink === submission?.repo?.url}
					>
						{#if saving.repo}<span class="loading loading-spinner loading-sm"></span>{/if}
						{submission?.repo ? 'Update' : 'Save'}
					</button>
				</form>
				{#if messages.repo}
					<p class="message" class:error={!messages.repo.ok}>{messages.repo.text}</p>
				{/if}
			</section>

			<!-- 3. Video -->
			<section class="submit-step" class:done={submission?.video} id="video_link">
				<div class="submit-step-header">
					<span class="submit-step-number">{submission?.video ? '✓' : '3'}</span>
					<div>
						<h3>
							{labels.video}
							{#if !required.includes('video')}<span class="optional">optional</span>{/if}
						</h3>
						<p class="meta">
							{#if submission?.video}
								Added by {submission.video.submittedBy ?? 'a teammate'}, {formatDate(
									submission.video.at
								)}
							{:else}
								YouTube (unlisted is fine) or Loom. Anyone with the link must be able to watch it.
							{/if}
						</p>
					</div>
				</div>
				<form method="POST" action="?/upload" class="link-form" use:enhance={submitter('video')}>
					<input type="hidden" name="csrf_token" value={data.csrfToken} />
					<input
						type="text"
						inputmode="url"
						name="video_link"
						class="input input-bordered"
						placeholder="youtu.be/…"
						bind:value={videoLink}
						disabled={closed}
						required
					/>
					<button
						class="btn btn-primary"
						disabled={closed ||
							saving.video ||
							!videoLink.trim() ||
							videoLink === submission?.video?.url}
					>
						{#if saving.video}<span class="loading loading-spinner loading-sm"></span>{/if}
						{submission?.video ? 'Update' : 'Save'}
					</button>
				</form>
				{#if messages.video}
					<p class="message" class:error={!messages.video.ok}>{messages.video.text}</p>
				{/if}
			</section>

			<!-- 4. Final presentation: only for finalists, later deadline (rules §8) -->
			<section
				class="submit-step final-step"
				class:done={submission?.final_presentation}
				class:highlight={data.inFinal && !submission?.final_presentation}
				id="final_presentation_file"
			>
				<div class="submit-step-header">
					<span class="submit-step-number">{submission?.final_presentation ? '✓' : '★'}</span>
					<div>
						<h3>
							{labels.final_presentation}
							<span class="optional">for the final</span>
						</h3>
						{#if data.inFinal}
							<p class="meta final-note">
								🎉 Your team is in the final! Upload the slides you'll show on stage.
							</p>
						{/if}
						<p class="meta">
							{#if submission?.final_presentation}
								<a
									href={submission.final_presentation.url}
									target="_blank"
									rel="noopener noreferrer">Open current file</a
								>
								· added by {submission.final_presentation.submittedBy ?? 'a teammate'}, {formatDate(
									submission.final_presentation.at
								)}
							{:else}
								Needed only if your team reaches the final. Upload it by
								{formatDate(finalDeadline)} – it can differ from the first presentation.
							{/if}
						</p>
					</div>
				</div>
				<form
					bind:this={finalForm}
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					use:enhance={submitter('final_presentation')}
				>
					<input type="hidden" name="csrf_token" value={data.csrfToken} />
					<input
						bind:this={finalFileInput}
						id="final-pdf-input"
						type="file"
						name="final_file"
						accept="application/pdf,.pdf"
						class="hidden"
						disabled={finalClosed || saving.final_presentation}
						onchange={() => uploadSelected(finalFileInput, finalForm)}
					/>
					<label
						for="final-pdf-input"
						class="dropzone"
						class:dragging={finalDragging}
						class:disabled={finalClosed}
						ondragover={(e) => {
							e.preventDefault();
							finalDragging = true;
						}}
						ondragleave={() => (finalDragging = false)}
						ondrop={(e) => onDrop(e, finalFileInput, finalForm)}
					>
						{#if saving.final_presentation}
							<span class="loading loading-spinner"></span> Uploading…
						{:else}
							<b>
								{submission?.final_presentation
									? 'Replace the final presentation'
									: 'Choose the final presentation'}
							</b>
							<span>or drop it here – it uploads right away</span>
						{/if}
					</label>
				</form>
				{#if messages.final_presentation}
					<p class="message" class:error={!messages.final_presentation.ok}>
						{messages.final_presentation.text}
					</p>
				{/if}
			</section>
		</div>

		<p class="footnote">
			Every change is listed with its author on <a href="/my-submission">My Submission</a>.
		</p>
	{/if}
</div>

<style>
	.upload-page {
		max-width: 760px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.team-line {
		color: rgba(255, 255, 255, 0.75);
		margin: -0.5rem 0 0;
	}

	.banner {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.9rem 1.1rem;
		border-radius: 0.75rem;
		border: 1px solid;
	}

	.banner-checkin {
		background: rgba(127, 123, 255, 0.12);
		border-color: rgba(127, 123, 255, 0.5);
	}

	.banner-ok {
		background: rgba(54, 195, 153, 0.1);
		border-color: rgba(54, 195, 153, 0.4);
		color: #36c399;
	}

	.banner-warn {
		background: rgba(247, 166, 84, 0.1);
		border-color: rgba(247, 166, 84, 0.45);
		color: #f7a654;
	}

	.progress-card {
		padding: 1.1rem 1.25rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.progress-card.complete {
		background: rgba(54, 195, 153, 0.08);
		border-color: rgba(54, 195, 153, 0.4);
	}

	.progress-card h2 {
		font-size: 1.35rem;
		font-weight: 700;
	}

	.progress-card p {
		color: rgba(255, 255, 255, 0.7);
		margin: 0.25rem 0 0.75rem;
	}

	.submit-steps {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.submit-step {
		padding: 1.1rem 1.25rem;
		border-radius: 0.75rem;
		background: #1a1b1f;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-left: 4px solid #f87272;
		scroll-margin-top: 1rem;
	}

	.submit-step.done {
		border-left-color: #36c399;
	}

	.submit-step-header {
		display: flex;
		gap: 0.85rem;
		align-items: flex-start;
		margin-bottom: 0.85rem;
	}

	.submit-step-number {
		flex: none;
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		display: grid;
		place-items: center;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.08);
	}

	.submit-step.done .submit-step-number {
		background: #36c399;
		color: #0f1322;
	}

	.submit-step h3 {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.optional {
		margin-left: 0.4rem;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}

	.meta {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.meta a {
		color: #4df2ff;
		text-decoration: underline;
	}

	.final-step {
		border-left-color: rgba(247, 166, 84, 0.6);
	}

	.final-step.highlight {
		border-color: rgba(247, 166, 84, 0.7);
		background: rgba(247, 166, 84, 0.06);
	}

	.final-note {
		color: #f7a654;
	}

	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 1.4rem;
		border: 2px dashed rgba(127, 123, 255, 0.5);
		border-radius: 0.75rem;
		cursor: pointer;
		text-align: center;
		transition: background 0.15s ease;
	}

	.dropzone b {
		font-size: 1.05rem;
		color: #7f7bff;
	}

	.dropzone span {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.dropzone:hover,
	.dropzone.dragging {
		background: rgba(127, 123, 255, 0.1);
	}

	.dropzone.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.link-form {
		display: flex;
		gap: 0.5rem;
	}

	.link-form input {
		flex: 1;
		min-width: 0;
	}

	.message {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: #36c399;
	}

	.message.error {
		color: #f87272;
	}

	.footnote {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.footnote a {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.link-form {
			flex-direction: column;
		}
	}
</style>
