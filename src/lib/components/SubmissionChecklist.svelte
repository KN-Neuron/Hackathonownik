<script lang="ts">
	import { page } from '$app/stores';
	import {
		SUBMISSION_ITEMS,
		SUBMISSION_ITEM_LABELS,
		type SubmissionItem,
		type TeamSubmission
	} from '$lib/types';

	interface Props {
		submission: TeamSubmission | null;
		required: SubmissionItem[];
		// participant: full rows with "Add / Change" actions; jury: compact status lines
		mode?: 'participant' | 'jury';
	}

	let { submission, required, mode = 'participant' }: Props = $props();

	const anchors: Record<SubmissionItem, string> = {
		presentation: 'presentation_file',
		repo: 'repo_link',
		video: 'video_link',
		final_presentation: 'final_presentation_file'
	};

	let missing = $derived(submission ? submission.missing : required);

	// Warn participants with an incomplete submission during the last 24 hours
	const deadline = new Date($page.data.eventConfig.deadline).getTime();
	let deadlineSoon = $derived(
		mode === 'participant' &&
			missing.length > 0 &&
			deadline > Date.now() &&
			deadline - Date.now() < 24 * 3_600_000
	);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString();
	}
</script>

<div class="checklist" class:compact={mode === 'jury'}>
	<div class="checklist-header">
		{#if mode === 'participant'}
			<h3>Your submission</h3>
		{/if}
		{#if missing.length === 0}
			<span class="pill pill-success">Complete</span>
		{:else}
			<span class="pill pill-warning">
				Incomplete – missing: {missing.map((item) => SUBMISSION_ITEM_LABELS[item]).join(', ')}
			</span>
		{/if}
	</div>

	{#if deadlineSoon}
		<div class="alert alert-warning mb-3 text-sm">
			Submissions close at {new Date(deadline).toLocaleString()} and your submission is still incomplete.
		</div>
	{/if}

	<ul>
		{#each SUBMISSION_ITEMS as item (item)}
			{@const entry = submission?.[item] ?? null}
			{@const optional = !entry && !required.includes(item)}
			<li class:done={entry} class:missing={!entry && !optional} class:optional>
				<span class="status-icon" aria-hidden="true">{entry ? '✓' : optional ? '–' : '✗'}</span>
				<div class="item-body">
					<span class="item-label">
						{SUBMISSION_ITEM_LABELS[item]}
						{#if !entry && required.includes(item)}
							<span class="required-tag">required</span>
						{/if}
					</span>
					{#if entry}
						{#if mode === 'participant'}
							<a class="item-value" href={entry.url} target="_blank" rel="noopener noreferrer">
								{entry.fileName ?? entry.url}
							</a>
						{/if}
						<span class="item-meta">
							Added by {entry.submittedBy ?? 'unknown'} · {formatDate(entry.at)}
						</span>
					{:else}
						<span class="item-meta">
							{item === 'final_presentation'
								? 'Needed only if the team reaches the final'
								: optional
									? 'Not required in this category'
									: 'Not submitted yet'}
						</span>
					{/if}
				</div>
				{#if mode === 'participant'}
					<a class="btn btn-sm btn-outline" href="/upload#{anchors[item]}">
						{entry ? 'Change' : 'Add'}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.checklist {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		padding: 1.25rem;
	}

	.checklist-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.checklist-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radius-control);
		background: rgba(255, 255, 255, 0.03);
	}

	li.optional {
		opacity: 0.6;
	}

	.status-icon {
		font-weight: 700;
		width: 1.25rem;
		text-align: center;
	}

	li.done .status-icon {
		color: #36c399;
	}

	li.missing .status-icon {
		color: #ff9a9a;
	}

	.item-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.item-label {
		font-weight: 600;
		color: #fff;
		font-size: 0.9rem;
	}

	.required-tag {
		margin-left: 0.4rem;
		font-size: 12px;
		font-weight: 600;
		color: #ff9a9a;
	}

	.item-value {
		font-size: 13px;
		color: var(--focus);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* Inside a team card: no second card around the list */
	.compact {
		padding: 0;
		background: none;
		border: 0;
	}

	.compact .checklist-header {
		margin-bottom: 0.4rem;
	}

	.compact ul {
		gap: 0.15rem;
	}

	.compact li {
		padding: 0.2rem 0.4rem;
		background: none;
	}

	.compact .item-label {
		font-size: 0.8rem;
	}

	.compact .item-body {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}
</style>
