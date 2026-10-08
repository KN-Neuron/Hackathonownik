import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import {
	SUBMISSION_ITEMS,
	type EventCategory,
	type RatingCriterion,
	type SubmissionItem
} from '$lib/types';

export interface AppConfig {
	event: {
		name: string;
		year: string | number;
		organizer: string;
		deadline: string;
		// Optional: teams should upload anything before this time
		checkin_deadline?: string;
		// The final presentation may be uploaded until this time (defaults to the deadline)
		final_presentation_deadline: string;
		// Timer length in the presenter mode
		stage_presentation_minutes: number;
		// Defaults for categories that don't define their own
		submission: {
			required: SubmissionItem[];
		};
		rating_criteria: RatingCriterion[];
		// At most this many teams per category reach the final
		finalists_per_category: number;
		// Normalized: every category has its own criteria and required items
		categories: EventCategory[];
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

function validItems(items: unknown): SubmissionItem[] | null {
	if (!Array.isArray(items)) return null;
	return items.filter((item): item is SubmissionItem =>
		(SUBMISSION_ITEMS as readonly string[]).includes(item)
	);
}

// Default to requiring every item when the config doesn't specify it; drop unknown keys
appConfig.event.submission = {
	required: validItems(appConfig.event.submission?.required) ?? [...SUBMISSION_ITEMS]
};
appConfig.event.rating_criteria = (appConfig.event.rating_criteria ?? []).map((c) => ({
	...c,
	stage: c.stage === 'final' ? 'final' : 'preliminary'
}));
appConfig.event.finalists_per_category = Number(appConfig.event.finalists_per_category) || 5;
appConfig.event.final_presentation_deadline ||= appConfig.event.deadline;
appConfig.event.stage_presentation_minutes = Number(appConfig.event.stage_presentation_minutes) || 5;

// Fill every category with the defaults it doesn't override
appConfig.event.categories = (appConfig.event.categories ?? []).map((category) => ({
	...category,
	rating_criteria: category.rating_criteria?.length
		? category.rating_criteria.map((c) => ({
				...c,
				stage: c.stage === 'final' ? ('final' as const) : ('preliminary' as const)
			}))
		: appConfig.event.rating_criteria,
	submission: {
		required: validItems(category.submission?.required) ?? appConfig.event.submission.required
	}
}));

export function getCategory(key: string | null | undefined): EventCategory | undefined {
	return appConfig.event.categories.find((c) => c.key === key);
}

/** Rating criteria of a category (the defaults for unknown categories). */
export function criteriaFor(key: string | null | undefined): RatingCriterion[] {
	return getCategory(key)?.rating_criteria ?? appConfig.event.rating_criteria;
}

/** Items a team of this category must submit (the defaults for unknown categories). */
export function requiredFor(key: string | null | undefined): SubmissionItem[] {
	return getCategory(key)?.submission.required ?? appConfig.event.submission.required;
}

if (!/(Z|[+-]\d{2}:\d{2})$/.test(appConfig.event.deadline)) {
	console.warn(
		`app_config.yaml: deadline "${appConfig.event.deadline}" has no UTC offset and will be read in the server's timezone`
	);
}
