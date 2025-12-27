<script lang="ts">
        import HeaderText from '$lib/components/HeaderText.svelte';
        import { IconNames } from '$lib/utils/utils';
        import { page } from '$app/stores';

        let { data } = $props();
        const submission = data.submission;
        const eventConfig = $page.data.eventConfig;


        let icon = IconNames.Presentation;
        let text = 'My Submission';

        const category = submission
                ? eventConfig.categories.find((c) => c.key === submission.category)
                : null;

        function formatDate(dateStr) {
                if (!dateStr) return 'N/A';
                return new Date(dateStr).toLocaleString();
        }

</script>

<div class="page-container">
        <HeaderText {icon} {text} />

        {#if submission}
                <div class="submission-card">
                        <div class="card-header">
                                <div class="header-content">
                                        <h2 class="team-name">{submission.teamName}</h2>
                                        <div class="badges">
                                                <span class="id-badge">ID: {submission.teamId}</span>
                                                {#if category}
                                                        <span
                                                                class="category-badge"
                                                                style="background: color-mix(in srgb, {category.color} 20%, transparent); color: {category.color}; border: 1px solid color-mix(in srgb, {category.color} 30%, transparent);"
                                                        >
                                                                {category.name}
                                                        </span>
                                                {/if}
                                        </div>
                                </div>
                                <div class="status-badge">
                                        <span class="status-dot"></span>
                                        Submitted
                                </div>
                        </div>

                        <div class="card-body">
                                <div class="info-grid">
                                        <div class="info-item">
                                                <span class="label">Submission Date</span>
                                                <span class="value">{formatDate(submission.created)}</span>
                                        </div>
                                        <div class="info-item">
                                                <span class="label">Last Updated</span>
                                                <span class="value">{formatDate(submission.updated)}</span>
                                        </div>
                                </div>


                                <div class="divider"></div>

                                <div class="links-section">
                                        <h3 class="section-title">Project Links</h3>
                                        <div class="links-grid">
                                                <a
                                                        href={submission.repo_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="link-card repo"
                                                        class:disabled={!submission.repo_link}
                                                >
                                                        <div class="link-icon">
                                                                <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="24"
                                                                        height="24"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"

                                                                        stroke-width="2"
                                                                >
                                                                        <path
                                                                                d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
                                                                        ></path>
                                                                </svg>
                                                        </div>
                                                        <div class="link-info">
                                                                <span class="link-title">Repository</span>
                                                                <span class="link-url"

                                                                        >{submission.repo_link || 'No repository link provided'}</span
                                                                >
                                                        </div>
                                                        {#if submission.repo_link}
                                                                <div class="link-arrow">→</div>
                                                        {/if}
                                                </a>


                                                <a
                                                        href={submission.video_link}

                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="link-card video"
                                                        class:disabled={!submission.video_link}
                                                >
                                                        <div class="link-icon">
                                                                <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="24"

                                                                        height="24"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        stroke-width="2"
                                                                >
                                                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                                </svg>
                                                        </div>
                                                        <div class="link-info">
                                                                <span class="link-title">Video Demo</span>
                                                                <span class="link-url">{submission.video_link || 'No video link provided'}</span>
                                                        </div>
                                                        {#if submission.video_link}
                                                                <div class="link-arrow">→</div>
                                                        {/if}
                                                </a>
                                        </div>
                                </div>

                                <div class="divider"></div>

                                <div class="presentation-section">

                                        <h3 class="section-title">Presentation File</h3>
                                        <div class="file-card">
                                                <div class="file-icon">
                                                        <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                width="32"
                                                                height="32"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                stroke-width="2"
                                                        >
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                                <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                </div>
                                                <div class="file-info">
                                                        <span class="file-name">presentation.pdf</span>
                                                        <span class="file-type">PDF Document</span>
                                                </div>
                                                <div class="file-actions">
                                                        <a href={submission.presentationUrl} target="_blank" class="btn btn-primary btn-sm">
                                                                View
                                                        </a>
                                                        <a
                                                                href={submission.presentationUrl}
                                                                download
                                                                class="btn btn-outline btn-sm"
                                                        >
                                                                Download
                                                        </a>
                                                </div>
                                        </div>
                                </div>
                        </div>
                </div>

        {#if submission.allPresentations.length > 1}
            <div class="history-section mt-8">
                <h3 class="text-xl font-bold mb-4">Submission History</h3>
                <div class="overflow-x-auto bg-base-200 rounded-lg border border-base-content/10">
                    <table class="table w-full">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each submission.allPresentations as pres, i}

                                <tr class={i === 0 ? 'bg-base-300/50' : ''}>
                                    <td class="font-mono text-sm">v{submission.allPresentations.length - i}</td>
                                    <td>{formatDate(pres.created)}</td>
                                    <td>
                                        {#if i === 0}
                                            <span class="badge badge-success badge-sm">Current</span>
                                        {:else}

                                            <span class="badge badge-ghost badge-sm">Archived</span>
                                        {/if}
                                    </td>
                                </tr>

                            {/each}

                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <div class="actions mt-8 flex justify-end">
            <a href="/upload" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload New Version
            </a>
        </div>

        {:else if data.error}
                <div class="alert alert-error">
                        <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="stroke-current shrink-0 h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                /></svg
                        >
                        <span>{data.error}</span>
                </div>
        <div class="mt-4 flex justify-center">
            <a href="/upload" class="btn btn-primary">Go to Upload</a>
        </div>
        {:else}
                <div class="empty-state">
                        <div class="empty-icon">
                                <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="64"

                                        height="64"

                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1"
                                >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="12" y1="18" x2="12" y2="12"></line>
                                        <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                        </div>
                        <h2>No Submission Found</h2>
                        <p>You haven't submitted a presentation yet.</p>
                        <a href="/upload" class="btn btn-primary mt-4">Upload Presentation</a>
                </div>
        {/if}
</div>

<style>
        .page-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 1.5rem;
        }

        .submission-card {
                background-color: #1e1f22;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);

                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .card-header {
                padding: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                background: rgba(255, 255, 255, 0.02);

        }

        .team-name {
                font-size: 1.5rem;
                font-weight: 700;
                color: #f0f0f0;
                margin: 0 0 0.5rem 0;

        }

        .badges {
                display: flex;
                gap: 0.5rem;
                align-items: center;
        }

        .id-badge {
                font-size: 0.75rem;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
                padding: 0.2rem 0.5rem;
                border-radius: 4px;

                font-family: monospace;
        }

        .category-badge {
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.2rem 0.6rem;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
        }

        .status-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: #36c399;
                background: rgba(54, 195, 153, 0.1);
                padding: 0.35rem 0.75rem;
                border-radius: 20px;
                border: 1px solid rgba(54, 195, 153, 0.2);
        }

        .status-dot {
                width: 8px;
                height: 8px;
                background-color: #36c399;
                border-radius: 50%;
                box-shadow: 0 0 0 2px rgba(54, 195, 153, 0.2);
        }

        .card-body {
                padding: 1.5rem;
        }

        .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
        }


        .info-item {
                display: flex;
                flex-direction: column;

                gap: 0.25rem;
        }

        .label {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.5);
        }

        .value {
                font-size: 1rem;
                color: #f0f0f0;
                font-weight: 500;
        }

        .divider {
                height: 1px;
                background-color: rgba(255, 255, 255, 0.1);
                margin: 1.5rem 0;
        }

        .section-title {
                font-size: 1rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
        }


        .links-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1rem;

        }


        .link-card {

                display: flex;
                align-items: center;
                padding: 1rem;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                text-decoration: none;
                transition: all 0.2s ease;
        }

        .link-card:not(.disabled):hover {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
        }

        .link-card.disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .link-card.repo .link-icon {
                color: #6e5494;
        }

        .link-card.video .link-icon {
                color: #ff0000;
        }

        .link-info {
                flex: 1;
                margin: 0 1rem;
                overflow: hidden;
        }

        .link-title {
                display: block;
                font-weight: 600;
                color: #f0f0f0;
                font-size: 0.9rem;
        }

        .link-url {
                display: block;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }

        .link-arrow {
                color: rgba(255, 255, 255, 0.3);
                font-weight: bold;
        }

        .file-card {
                display: flex;
                align-items: center;
                padding: 1rem;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 8px;
        }

        .file-icon {
                color: #3b82f6;
                margin-right: 1rem;
        }

        .file-info {
                flex: 1;
        }

        .file-name {
                display: block;
                font-weight: 600;
                color: #f0f0f0;
        }

        .file-type {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
        }

        .file-actions {
                display: flex;
                gap: 0.5rem;
        }

        .empty-state {
                text-align: center;
                padding: 4rem 2rem;
                background-color: #1e1f22;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .empty-icon {
                color: rgba(255, 255, 255, 0.2);
                margin-bottom: 1.5rem;
        }

        .empty-state h2 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                color: #f0f0f0;
        }

        .empty-state p {
                color: rgba(255, 255, 255, 0.6);
        }

        @media (max-width: 640px) {
                .card-header {
                        flex-direction: column;
                        gap: 1rem;
                }

                .status-badge {
                        align-self: flex-start;
                }

                .file-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                }

                .file-actions {
                        width: 100%;
                }

                .file-actions .btn {
                        flex: 1;

                }
        }
</style>
