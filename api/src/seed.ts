import { readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "node:crypto";
import { putCategory, putNominee } from "./db/categories.js";
import { createEvent } from "./db/events.js";
import { createParty, getParty } from "./db/parties.js";
import { getUserByEmail } from "./db/users.js";
import type { Category, Nominee, Party } from "./types/index.js";

const dataPath = resolve(import.meta.dirname, "../../data/2026-nominees.json");
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log(`Seeding ${data.categories.length} categories for ${data.ceremony}...`);

for (const cat of data.categories) {
  const category: Category = {
    categoryId: cat.categoryId,
    name: cat.name,
    displayOrder: cat.displayOrder,
    showImages: cat.showImages ?? false,
    upNext: false,
    winnerId: null,
    locked: false,
    resolvedAt: null,
  };

  await putCategory(category);
  console.log(`  ${cat.name} (${cat.nominees.length} nominees)`);

  for (let i = 0; i < cat.nominees.length; i++) {
    const nom = cat.nominees[i];
    const nominee: Nominee = {
      nomineeId: nom.nomineeId,
      categoryId: cat.categoryId,
      name: nom.name,
      subtitle: nom.subtitle,
      imageUrl: nom.imageUrl,
      displayOrder: i + 1,
    };
    await putNominee(nominee);
  }
}

// Seed Open Party and Event record
const OPEN_PARTY_HOST_EMAIL = "astoutj@gmail.com";
const EVENT_ID = "oscars_2026";

const hostUser = await getUserByEmail(OPEN_PARTY_HOST_EMAIL);
if (hostUser) {
  const openPartyId = randomUUID();
  const openParty: Party = {
    partyId: openPartyId,
    eventId: EVENT_ID,
    name: "Oscars 2026",
    hostUserId: hostUser.userId,
    allLocked: false,
    isOpen: true,
    publicParticipation: true,
    createdAt: new Date().toISOString(),
  };

  await createParty(openParty, hostUser.displayName);
  console.log(`Created Open Party: "${openParty.name}" (${openPartyId})`);

  await createEvent({
    eventId: EVENT_ID,
    name: "98th Academy Awards",
    templatePartyId: openPartyId,
    createdAt: new Date().toISOString(),
  });
  console.log(`Created Event: ${EVENT_ID} → templatePartyId=${openPartyId}`);
} else {
  console.warn(`⚠ Host user ${OPEN_PARTY_HOST_EMAIL} not found — skipping Open Party creation. Sign up first, then re-run seed.`);
}

console.log("Done!");
