import { z } from "zod";
import { UserTypeEnum } from "./types";

export const UserSchema = z.object({
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  SK: z.literal("META"),
  userId: z.string().ulid(),
  displayName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
  phone: z.string().optional(),
  locationId: z.string().ulid().optional(),
  activeLocationId: z.string().ulid().optional(),
  userType: UserTypeEnum,
  isAdmin: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;
