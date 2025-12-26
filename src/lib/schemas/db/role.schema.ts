import { z } from "zod";

export const RoleSchema = z.object({
  PK: z.string().regex(/^ROLE#.+$/),
  SK: z.literal("META"),
  roleName: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Role = z.infer<typeof RoleSchema>;
