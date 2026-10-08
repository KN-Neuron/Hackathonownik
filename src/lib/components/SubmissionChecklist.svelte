<script lang="ts">
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
		video: 'video_link'
	};

	let missing = $derived(submission ? submission.missing : required);

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
			<span class="badge badge-success gap-1">✓ Complete</span>
		{:else}
			<span class="badge badge-warning gap-1">
				Incomplete – missing: {missing.map((item) => SUBMISSION_ITEM_LABELS[item]).join(', ')}
			</span>
		{/if}
	</div>

	<ul>
		{#each SUBMISSION_ITEMS as item (item)}
			{@const entry = submission?.[item] ?? null}
			<li class:done={entry} class:missing={!entry}>
				<span class="status-icon" aria-hidden="true">{entry ? '✓' : '✗'}</span>
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
						<span class="item-meta">Not submitted yet</span>
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
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
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
		color: #f0f0f0;
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
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-left: 3px solid transparent;
	}

	li.done {
		border-left-color: #36c399;
	}

	li.missing {
		border-left-color: #f87272;
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
		color: #f87272;
	}

	.item-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.item-label {
		font-weight: 600;
		color: #f0f0f0;
		font-size: 0.9rem;
	}

	.required-tag {
		margin-left: 0.4rem;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		color: #f87272;
	}

	.item-value {
		font-size: 0.85rem;
		color: #4df2ff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.compact {
		padding: 0.5rem 0.75rem;
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
