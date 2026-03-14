import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Category, Nominee } from "../types/index.js";

// Per-party category override (for self-emceed parties)
export interface CategoryOverride {
  categoryId: string;
  winnerId: string | null;
  locked: boolean;
  upNext: boolean;
  resolvedAt: string | null;
}

const EVENT_PK = "EVENT#oscars_2026";

export async function getCategories(): Promise<Category[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": EVENT_PK,
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
      Key: { PK: EVENT_PK, SK: `CATEGORY#${categoryId}` },
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
      Key: { PK: EVENT_PK, SK: `CATEGORY#${categoryId}` },
      UpdateExpression:
        "SET winnerId = :winnerId, resolvedAt = :resolvedAt",
      ExpressionAttributeValues: {
        ":winnerId": winnerId,
        ":resolvedAt": new Date().toISOString(),
      },
    })
  );
}

export async function clearWinner(categoryId: string): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: EVENT_PK, SK: `CATEGORY#${categoryId}` },
      UpdateExpression:
        "SET winnerId = :null, resolvedAt = :null, locked = :locked",
      ExpressionAttributeValues: {
        ":null": null,
        ":locked": true,
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
      Key: { PK: EVENT_PK, SK: `CATEGORY#${categoryId}` },
      UpdateExpression: "SET locked = :locked",
      ExpressionAttributeValues: { ":locked": locked },
    })
  );
}

export async function setCategoryUpNext(
  categoryId: string,
  upNext: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: EVENT_PK, SK: `CATEGORY#${categoryId}` },
      UpdateExpression: "SET upNext = :upNext",
      ExpressionAttributeValues: { ":upNext": upNext },
    })
  );
}

export async function putCategory(category: Category): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: EVENT_PK,
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

// --- Per-party category overrides (self-emceed parties) ---

export async function getCategoryOverrides(partyId: string): Promise<CategoryOverride[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": "CATOVERRIDE#",
      },
    })
  );
  return (result.Items || []) as CategoryOverride[];
}

export async function setCategoryOverride(
  partyId: string,
  categoryId: string,
  updates: Partial<Pick<CategoryOverride, "winnerId" | "locked" | "upNext" | "resolvedAt">>
): Promise<void> {
  const parts: string[] = [];
  const values: Record<string, unknown> = {};

  if (updates.winnerId !== undefined) {
    parts.push("winnerId = :w");
    values[":w"] = updates.winnerId;
  }
  if (updates.locked !== undefined) {
    parts.push("locked = :l");
    values[":l"] = updates.locked;
  }
  if (updates.upNext !== undefined) {
    parts.push("upNext = :u");
    values[":u"] = updates.upNext;
  }
  if (updates.resolvedAt !== undefined) {
    parts.push("resolvedAt = :r");
    values[":r"] = updates.resolvedAt;
  }
  // Always store categoryId
  parts.push("categoryId = :cid");
  values[":cid"] = categoryId;

  if (parts.length === 0) return;

  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PARTY#${partyId}`, SK: `CATOVERRIDE#${categoryId}` },
      UpdateExpression: `SET ${parts.join(", ")}`,
      ExpressionAttributeValues: values,
    })
  );
}

export async function getPartyCategoriesWithOverrides(
  partyId: string
): Promise<Category[]> {
  const [categories, overrides] = await Promise.all([
    getCategories(),
    getCategoryOverrides(partyId),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.categoryId, o]));

  return categories.map((cat) => {
    const override = overrideMap.get(cat.categoryId);
    if (!override) {
      // No override — return with defaults (no winner, unlocked, not up-next)
      return { ...cat, winnerId: null, locked: false, upNext: false, resolvedAt: null };
    }
    return {
      ...cat,
      winnerId: override.winnerId,
      locked: override.locked,
      upNext: override.upNext,
      resolvedAt: override.resolvedAt,
    };
  });
}
