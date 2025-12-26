import { z } from "zod";
import { GroupTypeEnum } from "./types";

export const UserGroupSchema = z.object({
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),
  SK: z.literal("META"),
  groupId: z.string().ulid(),
  locationId: z.string().ulid(),
  groupType: GroupTypeEnum,
  name: z.string().min(1).max(255),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserGroup = z.infer<typeof UserGroupSchema>;
