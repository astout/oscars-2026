import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Academy, AcademyMember } from "../types/index.js";

export async function createAcademy(
  academy: Academy,
  hostDisplayName: string
): Promise<void> {
  const now = new Date().toISOString();

  // Write academy + host membership in parallel
  await Promise.all([
    db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `ACADEMY#${academy.academyId}`,
          SK: "METADATA",
          GSI1PK: `HOST#${academy.hostUserId}`,
          GSI1SK: `ACADEMY#${academy.academyId}`,
          ...academy,
        },
      })
    ),
    db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `ACADEMY#${academy.academyId}`,
          SK: `MEMBER#${academy.hostUserId}`,
          GSI1PK: `USER#${academy.hostUserId}`,
          GSI1SK: `ACADEMY#${academy.academyId}`,
          userId: academy.hostUserId,
          displayName: hostDisplayName,
          role: "host",
          status: "active",
          joinedAt: now,
        },
      })
    ),
  ]);
}

export async function getAcademy(
  academyId: string
): Promise<Academy | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACADEMY#${academyId}`, SK: "METADATA" },
    })
  );
  return (result.Item as Academy) || null;
}

export async function getAcademiesForUser(
  userId: string
): Promise<{ academyId: string; role: string; status: string }[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "ACADEMY#",
      },
    })
  );
  return (result.Items || []) as any[];
}

export async function getMembers(
  academyId: string
): Promise<AcademyMember[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": "MEMBER#",
      },
    })
  );
  return (result.Items || []) as AcademyMember[];
}

export async function getMember(
  academyId: string,
  userId: string
): Promise<AcademyMember | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACADEMY#${academyId}`,
        SK: `MEMBER#${userId}`,
      },
    })
  );
  return (result.Item as AcademyMember) || null;
}

export async function addMember(
  academyId: string,
  userId: string,
  displayName: string,
  status: "active" | "pending"
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ACADEMY#${academyId}`,
        SK: `MEMBER#${userId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `ACADEMY#${academyId}`,
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
  academyId: string,
  userId: string,
  status: "active" | "pending" | "left"
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACADEMY#${academyId}`,
        SK: `MEMBER#${userId}`,
      },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status },
    })
  );
}

export async function removeMember(
  academyId: string,
  userId: string
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACADEMY#${academyId}`,
        SK: `MEMBER#${userId}`,
      },
    })
  );
}

export async function setAllLocked(
  academyId: string,
  locked: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACADEMY#${academyId}`, SK: "METADATA" },
      UpdateExpression: "SET allLocked = :locked",
      ExpressionAttributeValues: { ":locked": locked },
    })
  );
}

export async function getAcademyByInviteCode(
  inviteCode: string
): Promise<Academy | null> {
  // Scan is fine for small dataset — upgrade to GSI if needed
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      FilterExpression: "inviteCode = :code",
      ExpressionAttributeValues: {
        ":pk": `HOST#`,
        ":code": inviteCode,
      },
    })
  );
  // Fallback: if GSI doesn't work well for this, we can scan
  return (result.Items?.[0] as Academy) || null;
}
