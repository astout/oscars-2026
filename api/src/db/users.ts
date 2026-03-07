import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
