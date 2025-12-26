import { z } from "zod";

export const PageSchema = z.object({
  PK: z.string().regex(/^PAGE#.+$/),
  SK: z.literal("META"),
  pageName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});
export type Page = z.infer<typeof PageSchema>;
