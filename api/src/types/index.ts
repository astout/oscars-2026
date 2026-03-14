export interface User {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Event {
  eventId: string;
  name: string;
  templatePartyId: string;
  createdAt: string;
}

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
  createdAt: string;
}

export interface PartyMember {
  userId: string;
  displayName: string;
  role: "host" | "member";
  status: "active" | "pending" | "left";
  publicOptOut?: boolean;
  joinedAt: string;
}

export interface Category {
  categoryId: string;
  name: string;
  displayOrder: number;
  showImages: boolean;
  upNext: boolean;
  winnerId: string | null;
  locked: boolean;
  resolvedAt: string | null;
}

export interface Nominee {
  nomineeId: string;
  categoryId: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  displayOrder: number;
}

export interface Pick {
  userId: string;
  categoryId: string;
  pick1NomineeId: string;
  pick2NomineeId: string;
  updatedAt: string;
}

export interface BonusEvent {
  eventId: string;
  question: string;
  options: string[];
  correctAnswer: string | null;
  minWager: number;
  maxWager: number;
  status: "open" | "locked" | "resolved";
  upNext: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Wager {
  userId: string;
  eventId: string;
  prediction: string;
  wagerAmount: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  categoryPoints: number;
  bonusPoints: number;
  totalPoints: number;
  correctFirst: number;
  correctSecond: number;
  rank: number;
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

// Auth context extracted from Cognito JWT
export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string;
}
