import { z } from "zod";
import { reportStatusSchema } from "./reports.js";

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: z.enum(["employee", "manager"]),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  managerId: z.string().uuid().nullable(),
  /** Depth from the current viewer (1 = direct report). */
  depth: z.number().int().positive(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamResponseSchema = z.object({
  members: z.array(teamMemberSchema),
});
export type TeamResponse = z.infer<typeof teamResponseSchema>;

export const teamMemberWithStatusSchema = teamMemberSchema.extend({
  reportStatus: reportStatusSchema,
  reportedAt: z.string().datetime().nullable(),
  reportMessage: z.string().nullable(),
});
export type TeamMemberWithStatus = z.infer<typeof teamMemberWithStatusSchema>;

export const teamStatusResponseSchema = z.object({
  eventId: z.string().uuid(),
  members: z.array(teamMemberWithStatusSchema),
});
export type TeamStatusResponse = z.infer<typeof teamStatusResponseSchema>;
