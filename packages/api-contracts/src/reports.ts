import { z } from "zod";

export const reportStatusSchema = z.enum(["safe", "need_help", "not_reported"]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  status: reportStatusSchema,
  message: z.string().nullable(),
  reportedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export type Report = z.infer<typeof reportSchema>;

export const reportWithUserSchema = reportSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    departmentId: z.string().uuid().nullable(),
    departmentName: z.string().nullable(),
  }),
});
export type ReportWithUser = z.infer<typeof reportWithUserSchema>;

export const reportSubmitInputSchema = z.object({
  status: z.enum(["safe", "need_help"]),
  message: z.string().max(500).optional().nullable(),
});
export type ReportSubmitInput = z.infer<typeof reportSubmitInputSchema>;

export const reportSubmitResponseSchema = z.object({ report: reportSchema });
export type ReportSubmitResponse = z.infer<typeof reportSubmitResponseSchema>;

export const reportListResponseSchema = z.object({
  reports: z.array(reportWithUserSchema),
});
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;
