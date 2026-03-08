import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Event } from "../types/index.js";

export async function getEvent(eventId: string): Promise<Event | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EVENT#${eventId}`, SK: "METADATA" },
    })
  );
  return (result.Item as Event) || null;
}

export async function createEvent(event: Event): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `EVENT#${event.eventId}`,
        SK: "METADATA",
        ...event,
      },
    })
  );
}

export async function isEmcee(eventId: string, userId: string): Promise<boolean> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EVENT#${eventId}`, SK: `EMCEE#${userId}` },
    })
  );
  return !!result.Item;
}

export async function getEmcees(eventId: string): Promise<{ userId: string; addedAt: string }[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `EVENT#${eventId}`,
        ":sk": "EMCEE#",
      },
    })
  );
  return (result.Items || []) as any[];
}

export async function addEmcee(eventId: string, userId: string): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `EMCEE#${userId}`,
        userId,
        addedAt: new Date().toISOString(),
      },
    })
  );
}

export async function removeEmcee(eventId: string, userId: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EVENT#${eventId}`, SK: `EMCEE#${userId}` },
    })
  );
}
