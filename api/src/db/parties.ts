import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Party, PartyMember } from "../types/index.js";

export async function createParty(
  party: Party,
  hostDisplayName: string
): Promise<void> {
  const now = new Date().toISOString();

  await Promise.all([
    db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PARTY#${party.partyId}`,
          SK: "METADATA",
          GSI1PK: `HOST#${party.hostUserId}`,
          GSI1SK: `PARTY#${party.partyId}`,
          ...party,
        },
      })
    ),
    db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PARTY#${party.partyId}`,
          SK: `MEMBER#${party.hostUserId}`,
          GSI1PK: `USER#${party.hostUserId}`,
          GSI1SK: `PARTY#${party.partyId}`,
          userId: party.hostUserId,
          displayName: hostDisplayName,
          role: "host",
          status: "active",
          joinedAt: now,
        },
      })
    ),
  ]);
}

export async function getParty(partyId: string): Promise<Party | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: "METADATA" },
    })
  );
  return (result.Item as Party) || null;
}

export async function getPartiesForUser(
  userId: string
): Promise<{ partyId: string; role: string; status: string }[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "PARTY#",
      },
    })
  );
  return (result.Items || []) as any[];
}

export async function getMembers(partyId: string): Promise<PartyMember[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": "MEMBER#",
      },
    })
  );
  return (result.Items || []) as PartyMember[];
}

export async function getMember(
  partyId: string,
  userId: string
): Promise<PartyMember | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PARTY#${partyId}`,
        SK: `MEMBER#${userId}`,
      },
    })
  );
  return (result.Item as PartyMember) || null;
}

export async function addMember(
  partyId: string,
  userId: string,
  displayName: string,
  status: "active" | "pending"
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PARTY#${partyId}`,
        SK: `MEMBER#${userId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `PARTY#${partyId}`,
        userId,
        displayName,
        role: "member",
        status,
        joinedAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
}

export async function updateMemberStatus(
  partyId: string,
  userId: string,
  status: "active" | "pending" | "left"
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PARTY#${partyId}`,
        SK: `MEMBER#${userId}`,
      },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status },
    })
  );
}

export async function removeMember(
  partyId: string,
  userId: string
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PARTY#${partyId}`,
        SK: `MEMBER#${userId}`,
      },
    })
  );
}

export async function setAllLocked(
  partyId: string,
  locked: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: "METADATA" },
      UpdateExpression: "SET allLocked = :locked",
      ExpressionAttributeValues: { ":locked": locked },
    })
  );
}

export async function deleteParty(partyId: string): Promise<void> {
  // Query all items under this party PK
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `PARTY#${partyId}` },
      ProjectionExpression: "PK, SK",
    })
  );

  const items = result.Items || [];
  if (items.length === 0) return;

  // Delete in batches of 25 (DynamoDB BatchWrite limit)
  const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
          })),
        },
      })
    );
  }
}

export async function renameParty(
  partyId: string,
  name: string
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: "METADATA" },
      UpdateExpression: "SET #name = :name",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":name": name },
    })
  );
}

export async function getOpenParties(
  eventId: string
): Promise<Party[]> {
  const result = await db.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk AND eventId = :eid AND isOpen = :open",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
        ":eid": eventId,
        ":open": true,
      },
    })
  );
  return (result.Items || []) as Party[];
}

export async function getPartiesWithPublicParticipation(
  eventId: string
): Promise<Party[]> {
  const result = await db.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        "SK = :sk AND eventId = :eid AND (publicParticipation = :pub OR attribute_not_exists(publicParticipation))",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
        ":eid": eventId,
        ":pub": true,
      },
    })
  );
  return (result.Items || []) as Party[];
}

export async function updatePartySettings(
  partyId: string,
  settings: {
    publicParticipation?: boolean;
    isListed?: boolean;
    isOpen?: boolean;
  }
): Promise<void> {
  const expressions: string[] = [];
  const values: Record<string, unknown> = {};

  if (settings.publicParticipation !== undefined) {
    expressions.push("publicParticipation = :pp");
    values[":pp"] = settings.publicParticipation;
  }
  if (settings.isListed !== undefined) {
    expressions.push("isListed = :il");
    values[":il"] = settings.isListed;
  }
  if (settings.isOpen !== undefined) {
    expressions.push("isOpen = :io");
    values[":io"] = settings.isOpen;
  }

  if (expressions.length === 0) return;

  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: "METADATA" },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeValues: values,
    })
  );
}

export async function getListedParties(
  eventId: string
): Promise<Party[]> {
  const result = await db.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "SK = :sk AND eventId = :eid AND isListed = :listed",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
        ":eid": eventId,
        ":listed": true,
      },
    })
  );
  return (result.Items || []) as Party[];
}

export async function updateMemberPublicOptOut(
  partyId: string,
  userId: string,
  optOut: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: `MEMBER#${userId}` },
      UpdateExpression: "SET publicOptOut = :opt",
      ExpressionAttributeValues: { ":opt": optOut },
    })
  );
}

export async function getMemberCount(partyId: string): Promise<number> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      FilterExpression: "#status = :active",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": "MEMBER#",
        ":active": "active",
      },
      Select: "COUNT",
    })
  );
  return result.Count || 0;
}
