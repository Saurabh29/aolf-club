/**
 * Relationship schemas (Edges) for DynamoDB single-table design
 */

import { z } from "zod";
import { UserTypeEnum, GroupTypeEnum } from "./types";

// ============================================================================
// USER ↔ LOCATION MEMBERSHIP (Bidirectional)
// ============================================================================

/**
 * User → Location edge
 * PK: "USER#<userId>", SK: "LOCATION#<locationId>"
 * Query: Query(PK="USER#...", SK begins_with "LOCATION#") → user's locations
 */
export const UserLocationEdgeSchema = z.object({
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  SK: z.string().regex(/^LOCATION#[0-9A-Z]{26}$/),
  userId: z.string().ulid(),
  locationId: z.string().ulid(),
  locationCode: z.string().optional(),
  locationName: z.string().optional(),
  joinedAt: z.string().datetime(),
});
export type UserLocationEdge = z.infer<typeof UserLocationEdgeSchema>;

/**
 * Location → User edge
 * PK: "LOCATION#<locationId>", SK: "USER#<userId>"
 * Query: Query(PK="LOCATION#...", SK begins_with "USER#") → location's users
 */
export const LocationUserEdgeSchema = z.object({
  PK: z.string().regex(/^LOCATION#[0-9A-Z]{26}$/),
  SK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  locationId: z.string().ulid(),
  userId: z.string().ulid(),
  userDisplayName: z.string().optional(),
  userType: UserTypeEnum.optional(),
  joinedAt: z.string().datetime(),
});
export type LocationUserEdge = z.infer<typeof LocationUserEdgeSchema>;

// ============================================================================
// USER ↔ GROUP MEMBERSHIP (Bidirectional)
// ============================================================================

/**
 * User → Group edge
 * PK: "USER#<userId>", SK: "GROUP#<groupId>"
 * Query: Query(PK="USER#...", SK begins_with "GROUP#") → user's groups
 */
export const UserGroupEdgeSchema = z.object({
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  SK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),
  userId: z.string().ulid(),
  groupId: z.string().ulid(),
  locationId: z.string().ulid(),
  groupType: GroupTypeEnum,
  groupName: z.string().optional(),
  joinedAt: z.string().datetime(),
});
export type UserGroupEdge = z.infer<typeof UserGroupEdgeSchema>;

/**
 * Group → User edge
 * PK: "GROUP#<groupId>", SK: "USER#<userId>"
 * Query: Query(PK="GROUP#...", SK begins_with "USER#") → group's members
 */
export const GroupUserEdgeSchema = z.object({
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),
  SK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  groupId: z.string().ulid(),
  userId: z.string().ulid(),
  userDisplayName: z.string().optional(),
  joinedAt: z.string().datetime(),
});
export type GroupUserEdge = z.infer<typeof GroupUserEdgeSchema>;

// ============================================================================
// GROUP → ROLE ASSIGNMENT
// ============================================================================

/**
 * Group → Role edge
 * PK: "GROUP#<groupId>", SK: "ROLE#<roleName>"
 * Query: Query(PK="GROUP#...", SK begins_with "ROLE#") → group's roles
 */
export const GroupRoleEdgeSchema = z.object({
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),
  SK: z.string().regex(/^ROLE#.+$/),
  groupId: z.string().ulid(),
  roleName: z.string(),
  assignedAt: z.string().datetime(),
});
export type GroupRoleEdge = z.infer<typeof GroupRoleEdgeSchema>;

// ============================================================================
// ROLE → PAGE PERMISSION
// ============================================================================

/**
 * Role → Page permission edge
 * PK: "ROLE#<roleName>", SK: "PAGE#<pageName>"
 * Query: Query(PK="ROLE#...", SK begins_with "PAGE#") → role's permissions
 * GetItem: GetItem(PK="ROLE#teacher", SK="PAGE#dashboard") → check permission
 */
export const RolePagePermissionSchema = z.object({
  PK: z.string().regex(/^ROLE#.+$/),
  // SK now uses PAGE#<ulid>
  SK: z.string().regex(/^PAGE#[0-9A-Z]{26}$/),
  roleName: z.string(),
  pageId: z.string().ulid(),
  pageName: z.string(),
  // permission is now an object with access and optional metadata
  permission: z.object({ access: z.enum(["ALLOW", "DENY"]) }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RolePagePermission = z.infer<typeof RolePagePermissionSchema>;
