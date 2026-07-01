import { z } from "zod";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Form schema dùng với React Hook Form — dueDate là string từ datetime-local input
export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(255, "Tiêu đề tối đa 255 ký tự"),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().refine(
    (v) => v === "" || !Number.isNaN(new Date(v).getTime()),
    "Deadline không hợp lệ"
  ),
});

// API schema cho POST — dueDate là ISO string
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(255, "Tiêu đề tối đa 255 ký tự"),
  description: z.string().trim().max(5000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

// API schema cho PATCH — tất cả optional
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Cần ít nhất một trường để cập nhật",
  });

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
  search: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskFormInput = z.input<typeof taskFormSchema>;
export type TaskFormData = z.output<typeof taskFormSchema>;
export type TaskListQueryData = z.infer<typeof taskListQuerySchema>;
