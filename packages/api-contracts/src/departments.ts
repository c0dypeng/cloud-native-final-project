import { z } from "zod";

export const departmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type Department = z.infer<typeof departmentSchema>;

export interface DeptTreeNode extends Department {
  children: DeptTreeNode[];
  userCount: number;
}

// Zod's z.lazy for recursive structures
export const deptTreeNodeSchema: z.ZodType<DeptTreeNode> = z.lazy(() =>
  departmentSchema.extend({
    children: z.array(deptTreeNodeSchema),
    userCount: z.number().int().nonnegative(),
  }),
);

export const deptCreateInputSchema = z.object({
  name: z.string().min(1, "請輸入部門名稱").max(100),
  parentId: z.string().uuid().optional().nullable(),
});
export type DeptCreateInput = z.infer<typeof deptCreateInputSchema>;

export const deptUpdateInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type DeptUpdateInput = z.infer<typeof deptUpdateInputSchema>;

export const deptListResponseSchema = z.object({
  departments: z.array(departmentSchema),
});
export type DeptListResponse = z.infer<typeof deptListResponseSchema>;

export const deptTreeResponseSchema = z.object({
  tree: z.array(deptTreeNodeSchema),
});
export type DeptTreeResponse = z.infer<typeof deptTreeResponseSchema>;
