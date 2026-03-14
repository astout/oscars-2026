import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import { randomUUID } from "crypto";

export interface Notification {
  notificationId: string;
  type: "category-awarded" | "category-up-next" | "leaderboard-change" | "wager-locked" | "wager-unlocked" | "wager-resolved";
  message: string;
  linkTo?: string;
  createdAt: string;
  ttl: number;
}

export async function createNotification(
  partyId: string,
  type: Notification["type"],
  message: string,
  linkTo?: string,
): Promise<Notification> {
  const now = new Date();
  const notification: Notification = {
    notificationId: randomUUID(),
    type,
    message,
    linkTo,
    createdAt: now.toISOString(),
    ttl: Math.floor(now.getTime() / 1000) + 7200, // 2 hour TTL
  };

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PARTY#${partyId}`,
        SK: `NOTIFY#${now.toISOString()}#${notification.notificationId}`,
        ...notification,
      },
    })
  );

  return notification;
}

export async function getNotificationsSince(
  partyId: string,
  since: string,
): Promise<Notification[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK > :sk",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": `NOTIFY#${since}`,
      },
      ScanIndexForward: true,
    })
  );
  // Filter to only NOTIFY# items (SK range could overlap with other prefixes)
  return ((result.Items || []) as (Notification & { SK: string })[])
    .filter((item) => item.SK.startsWith("NOTIFY#"))
    .map(({ SK: _, ...rest }) => rest as unknown as Notification);
}
