import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { BonusEvent, Wager } from "../types/index.js";

export async function createBonusEvent(
  academyId: string,
  event: BonusEvent
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ACADEMY#${academyId}`,
        SK: `BONUS#${event.eventId}`,
        ...event,
      },
    })
  );
}

export async function getBonusEvents(
  academyId: string
): Promise<BonusEvent[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": "BONUS#",
      },
    })
  );
  return (result.Items || []) as BonusEvent[];
}

export async function resolveBonusEvent(
  academyId: string,
  eventId: string,
  correctAnswer: string
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACADEMY#${academyId}`,
        SK: `BONUS#${eventId}`,
      },
      UpdateExpression:
        "SET correctAnswer = :answer, #status = :status, resolvedAt = :resolvedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":answer": correctAnswer,
        ":status": "resolved",
        ":resolvedAt": new Date().toISOString(),
      },
    })
  );
}

export async function placeWager(
  academyId: string,
  wager: Wager
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ACADEMY#${academyId}`,
        SK: `WAGER#${wager.userId}#${wager.eventId}`,
        ...wager,
      },
    })
  );
}

export async function getWagers(academyId: string): Promise<Wager[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": "WAGER#",
      },
    })
  );
  return (result.Items || []) as Wager[];
}

export async function getUserWagers(
  academyId: string,
  userId: string
): Promise<Wager[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": `WAGER#${userId}#`,
      },
    })
  );
  return (result.Items || []) as Wager[];
}
