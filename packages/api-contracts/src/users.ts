import { z } from "zod";
import { userRoleSchema } from "./auth.js";

export const userAdminViewSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  managerId: z.string().uuid().nullable(),
  managerName: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type UserAdminView = z.infer<typeof userAdminViewSchema>;

export const userCreateInputSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  name: z.string().min(1, "請輸入姓名").max(100),
  password: z.string().min(8, "密碼至少 8 個字元"),
  role: userRoleSchema.default("employee"),
  departmentId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  locale: z.string().optional().default("zh-TW"),
});
export type UserCreateInput = z.infer<typeof userCreateInputSchema>;

export const userUpdateInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  locale: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateInputSchema>;

export const userResetPasswordInputSchema = z.object({
  password: z.string().min(8, "密碼至少 8 個字元"),
});
export type UserResetPasswordInput = z.infer<
  typeof userResetPasswordInputSchema
>;

export const userListResponseSchema = z.object({
  users: z.array(userAdminViewSchema),
  total: z.number().int().nonnegative(),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;

// Query string booleans need explicit "true"/"false" handling — z.coerce.boolean
// treats any non-empty string as true (so "false" → true). We accept boolean
// or one of "true"/"1"/"false"/"0".
const boolFromQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

export const userListQuerySchema = z.object({
  q: z.string().optional(),
  role: userRoleSchema.optional(),
  departmentId: z.string().uuid().optional(),
  isActive: boolFromQuery.optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
