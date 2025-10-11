export function validateRating(data: any): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	
	if (!data.teamId) {
		errors.push('Team ID is required');
	}

	
	const ratingFields = ['innovation', 'usefulness', 'finalPresentation', 'implementation'];
	const validRange = { min: 1, max: 5 };

	for (const field of ratingFields) {
		const value = Number(data[field]);
		if (isNaN(value)) {
			errors.push(`${field} must be a number`);
		} else if (value < validRange.min || value > validRange.max) {
			errors.push(`${field} must be between ${validRange.min} and ${validRange.max}`);
		}
	}

	
	if (data.comments !== undefined && data.comments !== null && typeof data.comments !== 'string') {
		errors.push('Comments must be text');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

export function calculateFinalGrade(ratings: {
	innovation: number;
	usefulness: number;
	finalPresentation: number;
	implementation: number;
}): number {
	return (
		(Number(ratings.innovation) +
			Number(ratings.usefulness) +
			Number(ratings.finalPresentation) +
			Number(ratings.implementation)) /
		4
	);
}
