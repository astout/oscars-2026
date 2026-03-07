export interface Academy {
  academyId: string;
  name: string;
  hostUserId: string;
  inviteCode: string;
  allLocked: boolean;
  createdAt: string;
  role?: "host" | "member";
}

export interface AcademyMember {
  userId: string;
  displayName: string;
  role: "host" | "member";
  status: "active" | "pending" | "left";
  joinedAt: string;
}
