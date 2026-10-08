<script lang="ts">
	import { enhance } from '$app/forms';
	import HeaderText from '$lib/components/HeaderText.svelte';
	import { IconNames } from '$lib/utils/utils';

	let { data, form } = $props();
	let busy = $state(false);

	const example = 'name,email,team,category\nJan Kowalski,jan@example.com,Neuro Labs,adaptive\n';

	// Spreadsheet-friendly file with the passwords to hand out
	function downloadCredentials() {
		if (form?.step !== 'done') return;
		const cell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
		const lines = [
			'name,email,password,team,category',
			...form.created.map((p) =>
				[p.name, p.email, p.password, p.team, p.category].map(cell).join(',')
			)
		];
		const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'participant-logins.csv';
		link.click();
		URL.revokeObjectURL(url);
	}

	const enhanceBusy = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
</script>

<div class="import-page">
	<HeaderText icon={IconNames.Upload} text="Import teams and participants" />

	{#if form?.step === 'done'}
		<div class="panel done">
			<h2>Done: {form.created.length} accounts and {form.teamsCreated} teams created</h2>
			<p>
				<b>Download the logins now</b> – the passwords are shown only here and can't be read again (you
				can give a participant a new password later in PocketBase).
			</p>
			<div class="flex gap-2 mt-2">
				<button class="btn btn-primary btn-sm" onclick={downloadCredentials}>
					Download participant-logins.csv
				</button>
				<a class="btn btn-ghost btn-sm" href="/admin/dashboard">Back to the dashboard</a>
			</div>
			{#if form.failures.length}
				<h3>Could not create {form.failures.length} account(s)</h3>
				<ul>
					{#each form.failures as f (f.email)}<li>{f.email}: {f.message}</li>{/each}
				</ul>
			{/if}
			{#if form.skipped.length}
				<h3>Skipped (already had an account)</h3>
				<ul>
					{#each form.skipped as s (s.line)}<li>Line {s.line}: {s.message}</li>{/each}
				</ul>
			{/if}
			<div class="overflow-x-auto mt-3">
				<table class="table table-sm w-full">
					<thead><tr><th>Name</th><th>E-mail</th><th>Password</th><th>Team</th></tr></thead>
					<tbody>
						{#each form.created as p (p.email)}
							<tr
								><td>{p.name}</td><td>{p.email}</td><td><code>{p.password}</code></td><td
									>{p.team}</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="panel">
			<p>
				Upload a CSV with a header row and the columns <code>name</code>, <code>email</code>,
				<code>team</code>, <code>category</code> (Polish headers and a semicolon separator, as saved
				by Excel, work too). Categories: {data.categories.map((c) => c.key).join(', ')}. Teams are
				created when they don't exist yet; people who already have an account are skipped.
			</p>
			<pre class="example">{example}</pre>
			<form
				method="POST"
				action="?/preview"
				enctype="multipart/form-data"
				use:enhance={enhanceBusy}
				class="flex flex-wrap gap-2 items-center mt-3"
			>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input
					type="file"
					name="file"
					accept=".csv,text/csv"
					class="file-input file-input-bordered file-input-sm"
					required
				/>
				<button class="btn btn-sm btn-primary" disabled={busy}>Check the file</button>
			</form>
			{#if form?.message}<p class="text-error mt-2">{form.message}</p>{/if}
		</div>

		{#if form?.plan}
			{@const plan = form.plan}
			<div class="panel">
				<h2>Check</h2>
				{#if plan.errors.length}
					<div class="alert alert-error mb-3">
						<span
							>{plan.errors.length} problem(s) – fix the file and check it again. Nothing was created.</span
						>
					</div>
					<ul>
						{#each plan.errors as e (`${e.line}-${e.message}`)}
							<li>Line {e.line}: {e.message}</li>
						{/each}
					</ul>
				{:else}
					<p>
						<b>{plan.participants.length}</b> accounts and <b>{plan.newTeams.length}</b> new teams will
						be created.
					</p>
				{/if}

				{#if plan.warnings.length}
					<h3>Look at these (not blocking)</h3>
					<ul>
						{#each plan.warnings as w (w)}<li class="text-warning">{w}</li>{/each}
					</ul>
				{/if}
				{#if plan.skipped.length}
					<h3>Skipped: they already have an account ({plan.skipped.length})</h3>
					<ul>
						{#each plan.skipped as s (s.line)}<li>Line {s.line}: {s.message}</li>{/each}
					</ul>
				{/if}

				{#if plan.newTeams.length}
					<div class="overflow-x-auto mt-3">
						<table class="table table-sm w-full">
							<thead><tr><th>New team</th><th>Category</th><th>People</th></tr></thead>
							<tbody>
								{#each plan.newTeams as t (t.name)}
									<tr><td>{t.name}</td><td>{t.category}</td><td>{t.members}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if plan.errors.length === 0 && plan.participants.length > 0}
					<form method="POST" action="?/apply" use:enhance={enhanceBusy} class="mt-4">
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						<input type="hidden" name="csv" value={form.csv} />
						<button
							class="btn btn-primary"
							disabled={busy}
							onclick={(e) => {
								if (
									!confirm(
										`Create ${plan.participants.length} accounts and ${plan.newTeams.length} teams?`
									)
								)
									e.preventDefault();
							}}>Create the accounts</button
						>
					</form>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.import-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
	}

	.panel.done {
		border-color: rgba(54, 195, 153, 0.5);
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	h3 {
		font-weight: 600;
		margin: 0.75rem 0 0.25rem;
	}

	.example {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
		font-size: 0.85rem;
	}

	code {
		font-size: 0.9em;
	}
</style>
