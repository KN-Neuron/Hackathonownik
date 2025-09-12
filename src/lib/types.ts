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
}

// https://github.com/pocketbase/js-sdk?tab=readme-ov-file#specify-typescript-definitions
export interface TypedPocketBase extends PocketBase {
	collection(idOrName: 'users'): RecordService<User>;
}

export interface Rating {
	innovation: number;
	usefulness: number;
	finalPresentation: number;
	implementation: number;
	notes: string;
	jury: string;
	team: string;
}
