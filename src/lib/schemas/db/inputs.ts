/**
 * Input schemas for creating entities
 * These omit auto-generated fields (PK, SK, timestamps, IDs)
 */

import { z } from "zod";
import { UserTypeEnum, GroupTypeEnum, OAuthProviderEnum, PermissionEnum } from "./types";

export const CreateEmailIdentityInputSchema = z.object({
  email: z.string().email(),
  userId: z.string().ulid(),
  provider: OAuthProviderEnum.optional(),
});
export type CreateEmailIdentityInput = z.infer<typeof CreateEmailIdentityInputSchema>;

export const CreateUserInputSchema = z.object({
  displayName: z.string().min(1).max(255),
  userType: UserTypeEnum.default("MEMBER"),
  isAdmin: z.boolean().default(false),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateLocationInputSchema = z.object({
  locationCode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  address: z.string().optional(),
});
export type CreateLocationInput = z.infer<typeof CreateLocationInputSchema>;

export const CreateUserGroupInputSchema = z.object({
  locationId: z.string().ulid(),
  groupType: GroupTypeEnum,
  name: z.string().min(1).max(255),
});
export type CreateUserGroupInput = z.infer<typeof CreateUserGroupInputSchema>;

export const CreateRoleInputSchema = z.object({
  roleName: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const CreatePageInputSchema = z.object({
  pageName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreatePageInput = z.infer<typeof CreatePageInputSchema>;

export const AssignRoleToGroupInputSchema = z.object({
  groupId: z.string().ulid(),
  roleName: z.string().min(1).max(50),
});
export type AssignRoleToGroupInput = z.infer<typeof AssignRoleToGroupInputSchema>;

export const SetRolePagePermissionInputSchema = z.object({
  roleName: z.string().min(1).max(50),
  pageName: z.string().min(1).max(100),
  permission: PermissionEnum,
});
export type SetRolePagePermissionInput = z.infer<typeof SetRolePagePermissionInputSchema>;
