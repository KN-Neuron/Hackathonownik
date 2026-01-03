// src/lib/server/auth.ts
import { error, type RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types';

export class ServerSecurity {
	private readonly user: User | null;

	constructor(event: RequestEvent) {
		this.user = (event.locals.user as User) || null;
	}

	isAuthenticated() {
		if (!this.user) error(401, 'Authentication required');
		return this;
	}

	isAdmin() {
		this.isAuthenticated();
		if (!this.user?.admin) error(403, 'Administrator access required');
		return this;
	}

	isJury() {
		this.isAuthenticated();
		if (this.user?.role !== 'jury' && !this.user?.admin) error(403, 'Jury access required');
		return this;
	}

	isParticipant() {
		this.isAuthenticated();
		if (this.user?.role !== 'participant' && !this.user?.admin)
			error(403, 'Participant access required');
		return this;
	}

	hasTeam() {
		this.isAuthenticated();
		if (!this.user?.team && !this.user?.admin) error(403, 'Must be associated with a team');
		return this;
	}

	canUpload() {
		this.isAuthenticated();
		if (this.user?.role !== 'participant' && !this.user?.admin)
			error(403, 'Only participants can upload presentations');
		if (!this.user?.team && !this.user?.admin)
			error(403, 'Must be associated with a team to upload');
		return this;
	}

	canRate() {
		this.isAuthenticated();
		if (this.user?.role !== 'jury' && !this.user?.admin)
			error(403, 'Only jury members can rate presentations');
		return this;
	}

	canViewRankings() {
		this.isAuthenticated();
		return this;
	}

	isOwnerOrAdmin(resourceUserId: string) {
		this.isAuthenticated();
		if (this.user?.id !== resourceUserId && !this.user?.admin) error(403, 'Access denied');
		return this;
	}

	getUser(): User {
		this.isAuthenticated();
		return this.user!;
	}
}
