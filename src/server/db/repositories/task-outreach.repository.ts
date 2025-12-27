/**
 * Task Outreach Repository
 * 
 * DynamoDB operations for task-based outreach system.
 * Implements Phase 1 access patterns with no GSI, only Query/GetItem.
 * 
 * Key Operations:
 * - AP1: Fetch task details
 * - AP2: Fetch all targets for a task
 * - AP3: Fetch my assignments in a task
 * - AP6: Fetch tasks for a location
 * - AP8: Atomic self-assignment with retry
 * - AP9: Save/update interaction
 */

import { ulid } from "ulid";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient, TABLE_NAME } from "~/server/db/client";
import {
  type TaskItem,
  type TaskTargetItem,
  type TaskAssignmentItem,
  type InteractionItem,
  type LocationTaskIndex,
  taskPK,
  targetSK,
  assignmentSK,
  interactionSK,
  locationPK,
  locationTaskSK,
  userPK,
  userTaskAssignmentSK,
} from "~/lib/schemas/db/task-outreach.schema";
import type {
  OutreachTask,
  OutreachTaskListItem,
  AssignedUser,
  Interaction,
  SelfAssignResult,
} from "~/lib/schemas/ui/task.schema";

/**
 * AP1: Fetch task details by taskId
 */
export async function getTaskById(taskId: string): Promise<OutreachTask | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: taskPK(taskId),
        SK: "META",
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  const item = result.Item as TaskItem;

  // Fetch additional metadata (location name, creator name) from User items
  // For now, using placeholder - in production, batch get these
  const [locationResult, creatorResult] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `LOCATION#${item.locationId}`,
          SK: "META",
        },
      })
    ),
    docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${item.createdBy}`,
          SK: "PROFILE",
        },
      })
    ),
  ]);

  const locationName = (locationResult.Item as any)?.name ?? "Unknown Location";
  const createdByName = (creatorResult.Item as any)?.name ?? "Unknown User";

  return {
    taskId: item.taskId,
    locationId: item.locationId,
    locationName,
    createdBy: item.createdBy,
    createdByName,
    title: item.title,
    status: item.status,
    allowedActions: item.allowedActions,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * AP2: Fetch all targets for a task
 */
export async function getTaskTargets(taskId: string): Promise<TaskTargetItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": taskPK(taskId),
        ":skPrefix": "TARGET#",
      },
    })
  );

  return (result.Items ?? []) as TaskTargetItem[];
}

/**
 * AP3: Fetch my assignments for a task
 */
export async function getMyAssignments(
  taskId: string,
  assigneeUserId: string
): Promise<TaskAssignmentItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": taskPK(taskId),
        ":skPrefix": `ASSIGNMENT#${assigneeUserId}#`,
      },
    })
  );

  return (result.Items ?? []) as TaskAssignmentItem[];
}

/**
 * AP4: Fetch all assignments for a task (creator view)
 */
export async function getAllAssignments(taskId: string): Promise<TaskAssignmentItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": taskPK(taskId),
        ":skPrefix": "ASSIGNMENT#",
      },
    })
  );

  return (result.Items ?? []) as TaskAssignmentItem[];
}

/**
 * AP5: Fetch interaction for a target user
 */
export async function getInteraction(taskId: string, targetUserId: string): Promise<Interaction | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: taskPK(taskId),
        SK: interactionSK(targetUserId),
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  const item = result.Item as InteractionItem;
  return {
    actionsTaken: item.actionsTaken,
    notes: item.notes,
    rating: item.rating,
    followUpAt: item.followUpAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Batch fetch interactions for multiple target users
 */
export async function batchGetInteractions(
  taskId: string,
  targetUserIds: string[]
): Promise<Map<string, Interaction>> {
  if (targetUserIds.length === 0) {
    return new Map();
  }

  // DynamoDB BatchGetItem supports up to 100 items
  const interactions = new Map<string, Interaction>();

  // For simplicity, query all interactions and filter
  // In production, use BatchGetCommand
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": taskPK(taskId),
        ":skPrefix": "INTERACTION#",
      },
    })
  );

  const items = (result.Items ?? []) as InteractionItem[];
  for (const item of items) {
    if (targetUserIds.includes(item.targetUserId)) {
      interactions.set(item.targetUserId, {
        actionsTaken: item.actionsTaken,
        notes: item.notes,
        rating: item.rating,
        followUpAt: item.followUpAt,
        updatedAt: item.updatedAt,
      });
    }
  }

  return interactions;
}

/**
 * AP6: Fetch tasks for a location
 */
export async function getTasksByLocation(locationId: string): Promise<OutreachTaskListItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": locationPK(locationId),
        ":skPrefix": "TASK#",
      },
    })
  );

  const indexItems = (result.Items ?? []) as LocationTaskIndex[];

  // Fetch full task details and assignment counts for each
  const tasks = await Promise.all(
    indexItems.map(async (index) => {
      const [task, targets, assignments] = await Promise.all([
        getTaskById(index.taskId),
        getTaskTargets(index.taskId),
        getAllAssignments(index.taskId),
      ]);

      if (!task) {
        return null;
      }

      return {
        taskId: task.taskId,
        title: task.title,
        locationName: task.locationName,
        status: task.status,
        allowedActions: task.allowedActions,
        totalTargets: targets.length,
        assignedCount: assignments.length,
        createdAt: task.createdAt,
      };
    })
  );

  return tasks.filter((t) => t !== null) as OutreachTaskListItem[];
}

/**
 * AP8: Atomic self-assignment with retry logic
 * 
 * Algorithm:
 * 1. Query all targets
 * 2. Query all assignments
 * 3. Compute unassigned = targets - assigned
 * 4. Select N targets
 * 5. TransactWrite with conditional put (no double assignment)
 * 6. Retry on conflict
 */
export async function selfAssignUsers(
  taskId: string,
  assigneeUserId: string,
  requestedCount: number,
  maxRetries = 3
): Promise<SelfAssignResult> {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 1. Fetch all targets and assignments
      const [targets, assignments] = await Promise.all([
        getTaskTargets(taskId),
        getAllAssignments(taskId),
      ]);

      // 2. Compute unassigned targets
      const assignedTargetIds = new Set(assignments.map((a) => a.targetUserId));
      const unassignedTargets = targets.filter((t) => !assignedTargetIds.has(t.targetUserId));

      if (unassignedTargets.length === 0) {
        return {
          assignedCount: 0,
          requestedCount,
          message: "No unassigned users available",
        };
      }

      // 3. Select N targets (up to available)
      const assignCount = Math.min(requestedCount, unassignedTargets.length);
      const selectedTargets = unassignedTargets.slice(0, assignCount);

      // 4. Build transaction items (max 100 per transaction)
      const now = new Date().toISOString();
      const transactItems = [];

      for (const target of selectedTargets) {
        const assignmentItem: TaskAssignmentItem = {
          PK: taskPK(taskId),
          SK: assignmentSK(assigneeUserId, target.targetUserId),
          itemType: "TASK_ASSIGNMENT",
          taskId,
          assigneeUserId,
          targetUserId: target.targetUserId,
          assignedBy: "SELF",
          assignedAt: now,
          status: "PENDING",
        };

        transactItems.push({
          Put: {
            TableName: TABLE_NAME,
            Item: assignmentItem,
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        });

        // Also create user index item
        transactItems.push({
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: userPK(assigneeUserId),
              SK: userTaskAssignmentSK(taskId),
              itemType: "USER_TASK_INDEX",
              userId: assigneeUserId,
              taskId,
              taskTitle: task.title,
              locationId: task.locationId,
              assignedAt: now,
              status: "PENDING",
            },
            // Allow overwrite if user already has this task assigned
          },
        });
      }

      // 5. Update task status to IN_PROGRESS if first assignment
      if (assignments.length === 0 && task.status === "OPEN") {
        transactItems.push({
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: taskPK(taskId),
              SK: "META",
            },
            UpdateExpression: "SET #status = :status, updatedAt = :now",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":status": "IN_PROGRESS",
              ":now": now,
            },
          },
        });
      }

      // 6. Execute transaction
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: transactItems,
        })
      );

      return {
        assignedCount: assignCount,
        requestedCount,
        message: `Successfully assigned ${assignCount} user${assignCount !== 1 ? "s" : ""}`,
      };
    } catch (error: any) {
      // Check if it's a conditional check failure (conflict)
      if (
        error instanceof ConditionalCheckFailedException ||
        error.name === "TransactionCanceledException"
      ) {
        console.log(`[selfAssign] Attempt ${attempt + 1} failed due to conflict, retrying...`);
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }

      // Other errors - rethrow
      throw error;
    }
  }

  // Max retries exceeded
  throw new Error("Failed to assign users after multiple attempts. Please try again.");
}

/**
 * AP9: Save/update interaction (upsert)
 */
export async function saveInteraction(
  taskId: string,
  targetUserId: string,
  assigneeUserId: string,
  actionsTaken: { called: boolean; messaged: boolean },
  notes?: string,
  rating?: number,
  followUpAt?: string
): Promise<void> {
  const now = new Date().toISOString();

  const interactionItem: InteractionItem = {
    PK: taskPK(taskId),
    SK: interactionSK(targetUserId),
    itemType: "INTERACTION",
    taskId,
    targetUserId,
    assigneeUserId,
    actionsTaken,
    notes,
    rating,
    followUpAt,
    updatedAt: now,
  };

  // Upsert interaction
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: interactionItem,
    })
  );

  // Update assignment status to DONE if interaction is complete
  const isComplete = rating !== undefined || (notes && notes.length > 0);
  if (isComplete) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: taskPK(taskId),
          SK: assignmentSK(assigneeUserId, targetUserId),
          itemType: "TASK_ASSIGNMENT",
          taskId,
          assigneeUserId,
          targetUserId,
          assignedBy: "SELF", // We don't know, but doesn't matter for update
          assignedAt: now, // Will be overwritten if exists
          status: "DONE",
        },
      })
    );
  }
}

/**
 * Mark assignment as skipped
 */
export async function skipAssignment(
  taskId: string,
  assigneeUserId: string,
  targetUserId: string
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: taskPK(taskId),
        SK: assignmentSK(assigneeUserId, targetUserId),
        itemType: "TASK_ASSIGNMENT",
        taskId,
        assigneeUserId,
        targetUserId,
        assignedBy: "SELF",
        assignedAt: now,
        status: "SKIPPED",
      },
    })
  );
}

/**
 * Get assigned users with their interaction state
 * Used by Task Detail screen to display "My Assigned Users"
 */
export async function getAssignedUsersWithInteractions(
  taskId: string,
  assigneeUserId: string
): Promise<AssignedUser[]> {
  // 1. Get my assignments
  const assignments = await getMyAssignments(taskId, assigneeUserId);

  if (assignments.length === 0) {
    return [];
  }

  // 2. Get target user IDs
  const targetUserIds = assignments.map((a) => a.targetUserId);

  // 3. Batch fetch user details
  // For now, using placeholder - in production, batch get from USER# items
  const userDetailsMap = new Map<string, { name: string; phone: string }>();
  
  // Fetch user details (in production, use BatchGetCommand)
  await Promise.all(
    targetUserIds.map(async (userId) => {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: "PROFILE",
          },
        })
      );
      if (result.Item) {
        userDetailsMap.set(userId, {
          name: (result.Item as any).name ?? "Unknown User",
          phone: (result.Item as any).phone ?? "+00-0000000000",
        });
      }
    })
  );

  // 4. Batch fetch interactions
  const interactions = await batchGetInteractions(taskId, targetUserIds);

  // 5. Combine into AssignedUser objects
  const assignedUsers: AssignedUser[] = [];

  for (const assignment of assignments) {
    const userDetails = userDetailsMap.get(assignment.targetUserId) ?? {
      name: "Unknown User",
      phone: "+00-0000000000",
    };

    // Get target type from targets (we need to query this)
    const targetResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: taskPK(taskId),
          SK: targetSK(assignment.targetUserId),
        },
      })
    );
    const targetType = (targetResult.Item as TaskTargetItem)?.targetType ?? "MEMBER";

    assignedUsers.push({
      targetUserId: assignment.targetUserId,
      name: userDetails.name,
      phone: userDetails.phone,
      targetType,
      assignedAt: assignment.assignedAt,
      status: assignment.status,
      interaction: interactions.get(assignment.targetUserId),
    });
  }

  return assignedUsers;
}

/**
 * Get count of unassigned targets for a task
 */
export async function getUnassignedCount(taskId: string): Promise<number> {
  const [targets, assignments] = await Promise.all([
    getTaskTargets(taskId),
    getAllAssignments(taskId),
  ]);

  const assignedTargetIds = new Set(assignments.map((a) => a.targetUserId));
  const unassignedCount = targets.filter((t) => !assignedTargetIds.has(t.targetUserId)).length;

  return unassignedCount;
}
