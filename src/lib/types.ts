import PocketBase, { RecordService } from 'pocketbase';
export type { AuthModel, ClientResponseError } from 'pocketbase';

export interface User {
	admin: boolean;
	avatar: string;
	collectionId: string;
	collectionName: string;
	created: string;
	email: string;
	emailVisibility: boolean;
	id: string;
	name: string;
	updated: string;
	username: string;
	verified: boolean;
	role: string;
	// Categories a jury member rates, and the ones whose ratings they confirmed as final
	jury_categories?: string[];
	confirmed_categories?: string[];
	team?: string;
}


export interface TypedPocketBase extends PocketBase {
	collection(idOrName: 'users'): RecordService<User>;
}

export interface Rating {
	comments: string;
	jury: string;
	team: string;
	// Points per criterion of the team's category
	scores: Record<string, number>;
	finalGrade: number | null;
}

export type TeamCategory = string;

export interface Team {
	id: string;
	name: string;
	category: TeamCategory;
	collectionId?: string;
	collectionName?: string;
	created?: string;
	updated?: string;
}

export interface Presentation {
	collectionId: string;
	collectionName: string;
	created: string;
	id: string;
	team: string;
	updated: string;
	presentation: string;
	repo_link?: string | null;
	video_link?: string | null;
	submitted_by?: string;
	expand?: {
		team?: {
			id: string;
			name: string;
			category?: TeamCategory;
		};
		submitted_by?: {
			id: string;
			name?: string;
			email?: string;
		};
	};
}

export const SUBMISSION_ITEMS = ['presentation', 'repo', 'video'] as const;
export type SubmissionItem = (typeof SUBMISSION_ITEMS)[number];

export interface RatingCriterion {
	key: string;
	name: string;
	maxScore: number;
	// "final": rated only during the finalists' stage presentations (rules §8)
	stage?: 'preliminary' | 'final';
	description?: string;
}

export interface EventCategory {
	key: string;
	name: string;
	color: string;
	rating_criteria: RatingCriterion[];
	submission: { required: SubmissionItem[] };
}

export const SUBMISSION_ITEM_LABELS: Record<SubmissionItem, string> = {
	presentation: 'Presentation (PDF)',
	repo: 'Repository link',
	video: 'Video demo'
};

// One item (PDF / repo / video) as currently visible to the jury
export interface SubmissionEntry {
	// PDF: secure API URL; repo/video: the link itself
	url: string;
	recordId: string;
	fileName?: string;
	submittedBy: string | null;
	at: string;
}

export interface SubmissionHistoryEntry {
	recordId: string;
	at: string;
	submittedBy: string | null;
	items: SubmissionItem[];
}

// A team's submission merged from all of its partial uploads
export interface TeamSubmission {
	teamId: string;
	teamName: string;
	category: TeamCategory;
	presentation: SubmissionEntry | null;
	repo: SubmissionEntry | null;
	video: SubmissionEntry | null;
	missing: SubmissionItem[];
	complete: boolean;
	lastUpdated: string;
	// First save of the team, for the check-in
	firstSubmittedAt: string;
	history: SubmissionHistoryEntry[];
}
