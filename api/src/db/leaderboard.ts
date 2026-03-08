import type {
  Pick,
  LeaderboardEntry,
} from "../types/index.js";
import { getMembers } from "./parties.js";
import { getCategories } from "./categories.js";
import { getAllPicks } from "./picks.js";
import { getBonusEvents, getWagers } from "./bonus.js";
import { getUser } from "./users.js";

export async function computeLeaderboard(
  partyId: string
): Promise<LeaderboardEntry[]> {
  const [members, categories, picks, bonusEvents, wagers] = await Promise.all([
    getMembers(partyId),
    getCategories(),
    getAllPicks(partyId),
    getBonusEvents(partyId),
    getWagers(partyId),
  ]);

  const activeMembers = members.filter((m) => m.status === "active");

  // Look up actual display names from user profiles
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

  // Index picks by `userId:categoryId`
  const pickMap = new Map<string, Pick>();
  for (const p of picks) {
    pickMap.set(`${p.userId}:${p.categoryId}`, p);
  }

  // Index wagers by `userId:eventId`
  const wagerMap = new Map<string, { prediction: string; wagerAmount: number }>();
  for (const w of wagers) {
    wagerMap.set(`${w.userId}:${w.eventId}`, w);
  }

  const entries: LeaderboardEntry[] = activeMembers.map((member) => {
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
        bonusPoints += event.basePoints;
        bonusPoints += wager.wagerAmount;
      } else {
        bonusPoints -= wager.wagerAmount;
      }
    }

    const totalPoints = Math.max(0, categoryPoints + bonusPoints);

    return {
      userId: member.userId,
      displayName: displayNameMap.get(member.userId) || member.displayName,
      categoryPoints,
      bonusPoints,
      totalPoints,
      correctFirst,
      correctSecond,
      rank: 0,
    };
  });

  entries.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints || b.correctFirst - a.correctFirst
  );

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

  return entries;
}
