/**
 * Lead UI Schemas
 * 
 * These schemas define the structure for leads and call history.
 * Following the pattern of deriving from DB schemas where applicable.
 * 
 * For Phase 1, these are UI-only schemas since backend persistence is not in scope.
 */

import { z } from "zod";

/**
 * Lead status enum for tracking lead progression
 */
export const LeadStatusSchema = z.enum([
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
]);

export type LeadStatus = z.infer<typeof LeadStatusSchema>;

/**
 * Call outcome enum for call history entries
 */
export const CallOutcomeSchema = z.enum([
  "answered",
  "no_answer",
  "voicemail",
  "busy",
  "wrong_number",
  "callback_scheduled",
  "interested",
  "not_interested",
]);

export type CallOutcome = z.infer<typeof CallOutcomeSchema>;

/**
 * CallHistoryEntry - Individual call record for a lead
 */
export const CallHistoryEntrySchema = z.object({
  callId: z.string().ulid(),
  leadId: z.string().ulid(),
  calledAt: z.string().datetime(),
  outcome: CallOutcomeSchema,
  duration: z.number().int().min(0).optional(), // Duration in seconds
  notes: z.string().max(1000).optional(),
  calledBy: z.string().min(1).max(255), // User name or ID
});

export type CallHistoryEntry = z.infer<typeof CallHistoryEntrySchema>;

/**
 * Lead - Core lead entity with embedded call history
 */
export const LeadSchema = z.object({
  leadId: z.string().ulid(),
  name: z.string().min(1).max(255),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  email: z.string().email().optional(),
  status: LeadStatusSchema,
  source: z.string().max(100).optional(), // e.g., "web", "referral", "event"
  locationId: z.string().ulid().optional(), // Associated location if any
  assignedTo: z.string().min(1).max(255).optional(), // User name or ID
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastContactedAt: z.string().datetime().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  callHistory: z.array(CallHistoryEntrySchema).default([]),
});

export type Lead = z.infer<typeof LeadSchema>;

/**
 * AddCallFormSchema - Schema for logging a new call
 * Omits auto-generated fields
 */
export const AddCallFormSchema = CallHistoryEntrySchema.omit({
  callId: true,
  calledAt: true,
}).extend({
  // Override calledAt to be optional for UI (can default to now)
  calledAt: z.string().datetime().optional(),
});

export type AddCallForm = z.infer<typeof AddCallFormSchema>;

/**
 * LeadCardViewModel - Optimized view model for displaying leads in card lists
 * Includes computed fields for UI display
 */
export const LeadCardViewModelSchema = LeadSchema.extend({
  totalCalls: z.number().int().min(0),
  lastCallOutcome: CallOutcomeSchema.optional(),
  daysSinceLastContact: z.number().int().optional(),
});

export type LeadCardViewModel = z.infer<typeof LeadCardViewModelSchema>;
