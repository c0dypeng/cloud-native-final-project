import { z } from "zod";

export const statsBucketSchema = z.object({
  total: z.number().int().nonnegative(),
  safe: z.number().int().nonnegative(),
  needHelp: z.number().int().nonnegative(),
  notReported: z.number().int().nonnegative(),
});
export type StatsBucket = z.infer<typeof statsBucketSchema>;

export const deptStatsSchema = statsBucketSchema.extend({
  departmentId: z.string().uuid(),
  departmentName: z.string(),
});
export type DeptStats = z.infer<typeof deptStatsSchema>;

export const statsResponseSchema = z.object({
  eventId: z.string().uuid(),
  overall: statsBucketSchema,
  byDepartment: z.array(deptStatsSchema),
  generatedAt: z.string().datetime(),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

export const unreportedUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
});
export type UnreportedUser = z.infer<typeof unreportedUserSchema>;

export const unreportedResponseSchema = z.object({
  users: z.array(unreportedUserSchema),
});
export type UnreportedResponse = z.infer<typeof unreportedResponseSchema>;
