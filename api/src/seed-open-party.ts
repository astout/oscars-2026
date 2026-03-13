import { randomUUID } from "node:crypto";
import { createParty } from "./db/parties.js";
import { createEvent, getEvent } from "./db/events.js";
import type { Party } from "./types/index.js";

const EVENT_ID = "oscars_2026";
const HOST_USER_ID = "54c844d8-7071-708d-d3ca-54b1a72b64a2"; // astoutj@gmail.com

const existing = await getEvent(EVENT_ID);
if (existing?.templatePartyId) {
  console.log("Event already exists with templatePartyId:", existing.templatePartyId);
  process.exit(0);
}

const openPartyId = randomUUID();

const openParty: Party = {
  partyId: openPartyId,
  eventId: EVENT_ID,
  name: "Oscars 2026",
  hostUserId: HOST_USER_ID,
  allLocked: false,
  isOpen: true,
  publicParticipation: true,
  createdAt: new Date().toISOString(),
};

await createParty(openParty, "Alex");
console.log(`Created Open Party: "${openParty.name}" (${openPartyId})`);

await createEvent({
  eventId: EVENT_ID,
  name: "98th Academy Awards",
  templatePartyId: openPartyId,
  createdAt: new Date().toISOString(),
});
console.log(`Created Event: ${EVENT_ID} → templatePartyId=${openPartyId}`);
