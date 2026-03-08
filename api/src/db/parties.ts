import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
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
