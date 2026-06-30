import { z } from "zod";

/** Vai trò người dùng — khớp enum Role trong schema Prisma. */
export const userRoleSchema = z.enum(["ADMIN", "USER"], {
  errorMap: () => ({ message: "Vai trò không hợp lệ" }),
});

// ─── Form tạo user (client) ───────────────────────────────────────────────────

export const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ")
    .max(255, "Email tối đa 255 ký tự"),
  password: z
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
  role: userRoleSchema,
});

// ─── API tạo user ─────────────────────────────────────────────────────────────

export const createUserSchema = userFormSchema.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ")
    .max(255, "Email tối đa 255 ký tự"),
});

// ─── API cập nhật user (phân quyền / vô hiệu hóa) ──────────────────────────────

export const updateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserFormInput = z.input<typeof userFormSchema>;
export type UserFormData = z.output<typeof userFormSchema>;
export type CreateUserData = z.output<typeof createUserSchema>;
export type UpdateUserData = z.output<typeof updateUserSchema>;
