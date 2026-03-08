import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { User } from "../types/index.js";

export async function getUser(userId: string): Promise<User | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "METADATA" },
    })
  );
  return (result.Item as User) || null;
}

export async function ensureUser(
  userId: string,
  email: string,
  displayName?: string
): Promise<User> {
  const existing = await getUser(userId);
  if (existing) return existing;

  const user: User = {
    userId,
    displayName: displayName || email.split("@")[0],
    email,
    createdAt: new Date().toISOString(),
  };

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: "METADATA",
        ...user,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
  const result = await db.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND email = :email",
      ExpressionAttributeValues: {
        ":prefix": "USER#",
        ":sk": "METADATA",
        ":email": email.toLowerCase(),
      },
      Limit: 100,
    })
  );
  return (result.Items?.[0] as User) || null;
}

export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "METADATA" },
      UpdateExpression: "SET displayName = :name",
      ExpressionAttributeValues: { ":name": displayName },
    })
  );
}
