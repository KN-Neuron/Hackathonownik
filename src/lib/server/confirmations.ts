import { getAdminClient } from './adminClient';

/**
 * Mark or unmark a jury member's ratings of one category as final. Written as superuser:
 * users can't update their own record in PocketBase (they could otherwise change their role
 * or assigned categories).
 */
export async function setCategoryConfirmed(
	juryId: string,
	category: string,
	confirmed: boolean
): Promise<void> {
	const pb = await getAdminClient();
	const user = await pb.collection('users').getOne(juryId, { fields: 'confirmed_categories' });
	const current = new Set<string>(
		Array.isArray(user.confirmed_categories) ? user.confirmed_categories : []
	);
	if (confirmed === current.has(category)) return;

	if (confirmed) current.add(category);
	else current.delete(category);
	await pb.collection('users').update(juryId, { confirmed_categories: [...current] });
}
