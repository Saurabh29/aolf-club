import { z } from "zod";
import { OAuthProviderEnum } from "./types";

export const EmailIdentitySchema = z.object({
  PK: z.string().regex(/^EMAIL#.+$/),
  SK: z.literal("META"),
  email: z.string().email(),
  userId: z.string().ulid(),
  provider: OAuthProviderEnum.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;
