import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Pick } from "../types/index.js";

export async function setPick(academyId: string, pick: Pick): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ACADEMY#${academyId}`,
        SK: `PICK#${pick.userId}#${pick.categoryId}`,
        GSI1PK: `USER#${pick.userId}`,
        GSI1SK: `PICK#${academyId}#${pick.categoryId}`,
        ...pick,
      },
    })
  );
}

export async function getUserPicks(
  academyId: string,
  userId: string
): Promise<Pick[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": `PICK#${userId}#`,
      },
    })
  );
  return (result.Items || []) as Pick[];
}

export async function getAllPicks(academyId: string): Promise<Pick[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ACADEMY#${academyId}`,
        ":sk": "PICK#",
      },
    })
  );
  return (result.Items || []) as Pick[];
}
