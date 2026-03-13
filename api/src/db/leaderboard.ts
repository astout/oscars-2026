import type {
  Pick,
  PartyMember,
  LeaderboardEntry,
  PublicLeaderboardEntry,
} from "../types/index.js";
import { getMembers, getPartiesWithPublicParticipation } from "./parties.js";
import { getCategories } from "./categories.js";
import { getAllPicks } from "./picks.js";
import { getBonusEvents, getWagers } from "./bonus.js";
import { getUser } from "./users.js";

function assignRanks(entries: { totalPoints: number; correctFirst: number; rank: number }[]): void {
  entries.sort((a, b) => b.totalPoints - a.totalPoints || b.correctFirst - a.correctFirst);
  for (let i = 0; i < entries.length; i++) {
    if (
      i > 0 &&
      entries[i].totalPoints === entries[i - 1].totalPoints &&
      entries[i].correctFirst === entries[i - 1].correctFirst
    ) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = i + 1;
    }
  }
}

// Core scoring logic — takes pre-fetched members to avoid redundant DB calls
async function scorePartyMembers(
  partyId: string,
  activeMembers: PartyMember[]
): Promise<LeaderboardEntry[]> {
  const [categories, picks, bonusEvents, wagers] = await Promise.all([
    getCategories(),
    getAllPicks(partyId),
    getBonusEvents(partyId),
    getWagers(partyId),
  ]);

  const userProfiles = await Promise.all(
    activeMembers.map((m) => getUser(m.userId))
  );
  const displayNameMap = new Map<string, string>();
  for (let i = 0; i < activeMembers.length; i++) {
    displayNameMap.set(
      activeMembers[i].userId,
      userProfiles[i]?.displayName || activeMembers[i].displayName
    );
  }

  const resolvedCategories = categories.filter((c) => c.winnerId);
  const resolvedEvents = bonusEvents.filter((e) => e.status === "resolved");

  const pickMap = new Map<string, Pick>();
  for (const p of picks) {
    pickMap.set(`${p.userId}:${p.categoryId}`, p);
  }

  const wagerMap = new Map<string, { prediction: string; wagerAmount: number }>();
  for (const w of wagers) {
    wagerMap.set(`${w.userId}:${w.eventId}`, w);
  }

  return activeMembers.map((member) => {
    let categoryPoints = 0;
    let correctFirst = 0;
    let correctSecond = 0;

    for (const cat of resolvedCategories) {
      const pick = pickMap.get(`${member.userId}:${cat.categoryId}`);
      if (!pick) continue;
      if (pick.pick1NomineeId === cat.winnerId) {
        categoryPoints += 5;
        correctFirst++;
      } else if (pick.pick2NomineeId === cat.winnerId) {
        categoryPoints += 3;
        correctSecond++;
      }
    }

    let bonusPoints = 0;
    for (const event of resolvedEvents) {
      const wager = wagerMap.get(`${member.userId}:${event.eventId}`);
      if (!wager) continue;
      if (wager.prediction === event.correctAnswer) {
        bonusPoints += wager.wagerAmount;
      } else {
        bonusPoints -= wager.wagerAmount;
      }
    }

    return {
      userId: member.userId,
      displayName: displayNameMap.get(member.userId) || member.displayName,
      categoryPoints,
      bonusPoints,
      totalPoints: categoryPoints + bonusPoints,
      correctFirst,
      correctSecond,
      rank: 0,
    };
  });
}

export async function computeLeaderboard(
  partyId: string
): Promise<LeaderboardEntry[]> {
  const members = await getMembers(partyId);
  const activeMembers = members.filter((m) => m.status === "active");
  const entries = await scorePartyMembers(partyId, activeMembers);
  assignRanks(entries);
  return entries;
}

export async function computePublicLeaderboard(
  eventId: string
): Promise<PublicLeaderboardEntry[]> {
  const parties = await getPartiesWithPublicParticipation(eventId);
  if (parties.length === 0) return [];

  // Fan-out: score each participating party with a single getMembers call
  const partyLeaderboards = await Promise.all(
    parties.map(async (party) => {
      const [members, hostProfile] = await Promise.all([
        getMembers(party.partyId),
        getUser(party.hostUserId),
      ]);

      const activeMembers = members.filter((m) => m.status === "active");
      const optOutSet = new Set(
        members.filter((m) => m.publicOptOut).map((m) => m.userId)
      );

      const entries = await scorePartyMembers(party.partyId, activeMembers);
      const hostDisplayName = hostProfile?.displayName || "Host";

      return entries
        .filter((entry) => !optOutSet.has(entry.userId))
        .map((entry) => ({
          ...entry,
          partyId: party.partyId,
          partyName: party.name,
          hostDisplayName,
        }));
    })
  );

  const allEntries = partyLeaderboards.flat();
  assignRanks(allEntries);
  return allEntries;
}
