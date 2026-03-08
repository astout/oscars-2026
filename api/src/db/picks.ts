import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./client.js";
import type { Pick } from "../types/index.js";

export async function setPick(partyId: string, pick: Pick): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PARTY#${partyId}`,
        SK: `PICK#${pick.userId}#${pick.categoryId}`,
        GSI1PK: `USER#${pick.userId}`,
        GSI1SK: `PICK#${partyId}#${pick.categoryId}`,
        ...pick,
      },
    })
  );
}

export async function getUserPicks(
  partyId: string,
  userId: string
): Promise<Pick[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": `PICK#${userId}#`,
      },
    })
  );
  return (result.Items || []) as Pick[];
}

export async function getAllPicks(partyId: string): Promise<Pick[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `PARTY#${partyId}`,
        ":sk": "PICK#",
      },
    })
  );
  return (result.Items || []) as Pick[];
}
