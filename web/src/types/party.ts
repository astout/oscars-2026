export interface Party {
  partyId: string;
  eventId: string;
  name: string;
  hostUserId: string;
  allLocked: boolean;
  isOpen?: boolean;
  isListed?: boolean;
  publicParticipation?: boolean;
  emceeSync?: boolean;
  isEmcee?: boolean;
  isTemplateParty?: boolean;
  createdAt: string;
  role?: "host" | "member";
}

export interface ListedParty {
  partyId: string;
  name: string;
  eventId: string;
  hostDisplayName: string;
  memberCount: number;
  isOpen: boolean;
}

export interface PartyMember {
  userId: string;
  displayName: string;
  role: "host" | "member";
  status: "active" | "pending" | "left";
  publicOptOut?: boolean;
  joinedAt: string;
}

export interface PublicLeaderboardEntry {
  userId: string;
  displayName: string;
  partyId: string;
  partyName: string;
  hostDisplayName: string;
  categoryPoints: number;
  bonusPoints: number;
  totalPoints: number;
  correctFirst: number;
  correctSecond: number;
  rank: number;
}

export interface PublicParty {
  partyId: string;
  name: string;
  eventId: string;
  memberCount: number;
}

export interface Invite {
  code: string;
  createdBy: string;
  expiresAt: string;
  isUniversal?: boolean;
}
