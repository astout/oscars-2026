import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Category, Nominee } from "../types/index.js";

export async function getCategories(): Promise<Category[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": "YEAR#2026",
        ":sk": "CATEGORY#",
      },
    })
  );
  const items = (result.Items || []) as Category[];
  return items.sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getCategory(
  categoryId: string
): Promise<Category | null> {
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: "YEAR#2026", SK: `CATEGORY#${categoryId}` },
    })
  );
  return (result.Item as Category) || null;
}

export async function getNominees(categoryId: string): Promise<Nominee[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CATEGORY#${categoryId}`,
        ":sk": "NOMINEE#",
      },
    })
  );
  const items = (result.Items || []) as Nominee[];
  return items.sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function setWinner(
  categoryId: string,
  winnerId: string
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: "YEAR#2026", SK: `CATEGORY#${categoryId}` },
      UpdateExpression:
        "SET winnerId = :winnerId, resolvedAt = :resolvedAt",
      ExpressionAttributeValues: {
        ":winnerId": winnerId,
        ":resolvedAt": new Date().toISOString(),
      },
    })
  );
}

export async function setCategoryLocked(
  categoryId: string,
  locked: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: "YEAR#2026", SK: `CATEGORY#${categoryId}` },
      UpdateExpression: "SET locked = :locked",
      ExpressionAttributeValues: { ":locked": locked },
    })
  );
}

export async function putCategory(category: Category): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: "YEAR#2026",
        SK: `CATEGORY#${category.categoryId}`,
        ...category,
      },
    })
  );
}

export async function putNominee(nominee: Nominee): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `CATEGORY#${nominee.categoryId}`,
        SK: `NOMINEE#${nominee.nomineeId}`,
        ...nominee,
      },
    })
  );
}
