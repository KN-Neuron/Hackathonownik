import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { SUBMISSION_ITEMS, type SubmissionItem } from '$lib/types';

export interface AppConfig {
	event: {
		name: string;
		year: string | number;
		organizer: string;
		deadline: string;
		submission: {
			required: SubmissionItem[];
		};
		categories: Array<{
			key: string;
			name: string;
			color: string;
		}>;
		rating_criteria: Array<{
			key: string;
			name: string;
			maxScore: number;
			description?: string;
		}>;
		links: Array<{
			title: string;
			description: string;
			url: string;
			buttonText: string;
		}>;
		schedule: Array<{
			day: string;
			events: Array<{
				time: string;
				description: string;
			}>;
		}>;
	};
}

const configPath = path.resolve('app_config.yaml');
const fileContents = fs.readFileSync(configPath, 'utf8');
export const appConfig = yaml.load(fileContents) as AppConfig;

// Default to requiring every item when the config doesn't specify it; drop unknown keys
const requiredItems = appConfig.event.submission?.required ?? [...SUBMISSION_ITEMS];
appConfig.event.submission = {
	required: requiredItems.filter((item): item is SubmissionItem =>
		(SUBMISSION_ITEMS as readonly string[]).includes(item)
	)
};
