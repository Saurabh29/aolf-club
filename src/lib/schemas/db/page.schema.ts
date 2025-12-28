import { z } from "zod";

export const PageSchema = z.object({
  PK: z.string().regex(/^PAGE#[0-9A-Z]{26}$/),
  SK: z.literal("META"),
  pageId: z.string().ulid(),
  pageName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});
export type Page = z.infer<typeof PageSchema>;
