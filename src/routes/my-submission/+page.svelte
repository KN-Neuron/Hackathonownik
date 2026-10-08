<script lang="ts">
	import HeaderText from '$lib/components/HeaderText.svelte';
	import SubmissionChecklist from '$lib/components/SubmissionChecklist.svelte';
	import { IconNames } from '$lib/utils/utils';
	import { SUBMISSION_ITEM_LABELS } from '$lib/types';

	let { data } = $props();
	let submission = $derived(data.submission);
	const eventConfig = data.eventConfig;

	let icon = IconNames.Presentation;
	let text = 'My Submission';

	let category = $derived(
		submission ? eventConfig.categories.find((c) => c.key === submission.category) : null
	);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString();
	}
</script>

<div class="page-container">
	<HeaderText {icon} {text} />

	{#if data.error}
		<div class="alert alert-error">
			<span>{data.error}</span>
		</div>
	{:else}
		{#if submission}
			<div class="team-header">
				<h2 class="team-name">{submission.teamName}</h2>
				{#if category}
					<span
						class="category-badge"
						style="background: color-mix(in srgb, {category.color} 20%, transparent); color: {category.color}; border: 1px solid color-mix(in srgb, {category.color} 30%, transparent);"
					>
						{category.name}
					</span>
				{/if}
				<span class="last-updated">Last change: {formatDate(submission.lastUpdated)}</span>
			</div>
		{/if}

		<SubmissionChecklist {submission} required={eventConfig.submission.required} />

		{#if submission}
			<div class="history-section">
				<h3>Change history</h3>
				<p class="history-help">
					Every save of your team is listed here. The jury sees the newest version of each item.
				</p>
				<div class="overflow-x-auto bg-base-200 rounded-lg border border-base-content/10">
					<table class="table w-full">
						<thead>
							<tr>
								<th>Date</th>
								<th>Submitted by</th>
								<th>What was added</th>
							</tr>
						</thead>
						<tbody>
							{#each submission.history as entry (entry.recordId)}
								<tr>
									<td>{formatDate(entry.at)}</td>
									<td>{entry.submittedBy ?? 'unknown'}</td>
									<td>
										<div class="flex flex-wrap gap-1">
											{#each entry.items as item (item)}
												{@const current = submission[item]?.recordId === entry.recordId}
												<span
													class="badge badge-sm {current ? 'badge-success' : 'badge-ghost'}"
													title={current
														? 'Currently visible to the jury'
														: 'Replaced by a newer version'}
												>
													{SUBMISSION_ITEM_LABELS[item]}
												</span>
											{/each}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="history-help">
					<span class="badge badge-success badge-xs"></span> currently visible to the jury
					<span class="badge badge-ghost badge-xs ml-3"></span> replaced by a newer version
				</p>
			</div>
		{/if}

		<div class="actions">
			<a href="/upload" class="btn btn-primary">
				{submission ? 'Add or change items' : 'Submit your project'}
			</a>
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.team-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.team-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f0f0f0;
		margin: 0;
	}

	.category-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.last-updated {
		margin-left: auto;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.history-section h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.history-help {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0.5rem 0;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
