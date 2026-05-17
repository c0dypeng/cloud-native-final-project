import { z } from "zod";

export const userRoleSchema = z.enum(["employee", "manager"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  departmentId: z.string().uuid().nullable(),
  managerId: z.string().uuid().nullable(),
  locale: z.string().default("zh-TW"),
});
export type UserPublic = z.infer<typeof userPublicSchema>;

export const loginInputSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(1, "請輸入密碼"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const meResponseSchema = z.object({
  user: userPublicSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const adminLoginInputSchema = z.object({
  username: z.string().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
});
export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

export const adminLoginResponseSchema = z.object({
  sessionId: z.string().uuid(),
  username: z.string(),
});
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;

export const adminMeResponseSchema = z.object({
  admin: z.object({ adminId: z.string().uuid(), username: z.string() }),
});
export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "新密碼至少 8 個字元"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
