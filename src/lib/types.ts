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
	confirmedRating?: boolean;
	team?: string;
}


export interface TypedPocketBase extends PocketBase {
	collection(idOrName: 'users'): RecordService<User>;
}

export interface Rating {
	innovation: number;
	usefulness: number;
	finalPresentation: number;
	implementation: number;
	comments: string;
	jury: string;
	team: string;
	presentation?: string;
	finalGrade: number | null;
}

export type TeamCategory = 'wellness' | 'commerce';

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
	expand?: {
		team?: {
			id: string;
			name: string;
			category?: TeamCategory;
		};
	};
}
