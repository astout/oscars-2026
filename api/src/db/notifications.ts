import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import { randomUUID } from "crypto";

export interface Notification {
  notificationId: string;
  type: "category-awarded" | "category-up-next" | "leaderboard-change" | "wager-locked" | "wager-unlocked" | "wager-resolved";
  message: string;
  linkTo?: string;
  userId?: string; // null/undefined = broadcast to all, specific = only that user
  createdAt: string;
  ttl: number;
}

export async function createNotification(
  partyId: string,
  type: Notification["type"],
  message: string,
  linkTo?: string,
  userId?: string,
): Promise<Notification> {
  const now = new Date();
  const notification: Notification = {
    notificationId: randomUUID(),
    type,
    message,
    linkTo,
    ...(userId && { userId }),
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
  userId?: string,
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
  return ((result.Items || []) as (Notification & { SK: string })[])
    .filter((item) => item.SK.startsWith("NOTIFY#"))
    // Filter: show broadcast notifications (no userId) + user's own personalized ones
    .filter((item) => !item.userId || item.userId === userId)
    .map(({ SK: _, ...rest }) => rest as unknown as Notification);
}
