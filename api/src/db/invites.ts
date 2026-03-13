import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";

const UNIVERSAL_SK = "INVITE#__universal__";
const INVITE_TTL_DAYS = 7;

function randomCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

export async function createInvite(
  partyId: string,
  createdBy: string
): Promise<{ code: string; expiresAt: string }> {
  const code = randomCode();
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const ttl = Math.floor(Date.now() / 1000) + INVITE_TTL_DAYS * 24 * 60 * 60;

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PARTY#${partyId}`,
        SK: `INVITE#${code}`,
        code,
        createdBy,
        expiresAt,
        ttl,
      },
    })
  );

  return { code, expiresAt };
}

export async function validateAndConsumeCode(
  partyId: string,
  code: string,
  usedBy: string
): Promise<boolean> {
  // Try ephemeral first
  const ephemeral = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: `INVITE#${code}` },
    })
  );

  if (ephemeral.Item) {
    // Check if expired
    if (ephemeral.Item.ttl && ephemeral.Item.ttl < Date.now() / 1000) {
      return false;
    }
    // Consume (delete) the ephemeral invite
    await db.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARTY#${partyId}`, SK: `INVITE#${code}` },
      })
    );
    return true;
  }

  // Try universal code
  const universal = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: UNIVERSAL_SK },
    })
  );

  if (universal.Item && universal.Item.code === code) {
    return true;
  }

  return false;
}

export async function setUniversalCode(
  partyId: string,
  code: string,
  createdBy: string
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PARTY#${partyId}`,
        SK: UNIVERSAL_SK,
        code,
        createdBy,
        createdAt: new Date().toISOString(),
      },
    })
  );
}

export async function deleteUniversalCode(partyId: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: UNIVERSAL_SK },
    })
  );
}

export async function getUniversalCode(
  partyId: string
): Promise<string | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: UNIVERSAL_SK },
    })
  );
  return result.Item?.code ?? null;
}

export async function listActiveInvites(
  partyId: string
): Promise<{ code: string; createdBy: string; expiresAt: string; isUniversal?: boolean }[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": "INVITE#",
      },
    })
  );

  const now = Date.now() / 1000;
  return (result.Items || [])
    .filter((item) => !item.ttl || item.ttl > now)
    .map((item) => ({
      code: item.code,
      createdBy: item.createdBy,
      expiresAt: item.expiresAt || "",
      ...(item.SK === UNIVERSAL_SK ? { isUniversal: true } : {}),
    }));
}

export async function deleteInvite(
  partyId: string,
  code: string
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: `INVITE#${code}` },
    })
  );
}
