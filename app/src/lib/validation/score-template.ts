import { z } from "zod";

// ─── ScoreTemplate ──────────────────────────────────────────────────────────

export const templateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên mẫu không được để trống")
    .max(255, "Tên mẫu tối đa 255 ký tự"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const createTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên mẫu không được để trống")
    .max(255, "Tên mẫu tối đa 255 ký tự"),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(1, "Tên mẫu không được để trống").max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Cần ít nhất một trường để cập nhật",
  });

// ─── ScoreCriteria ──────────────────────────────────────────────────────────

export const criteriaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên tiêu chí không được để trống")
    .max(255, "Tên tiêu chí tối đa 255 ký tự"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  maxScore: z.coerce
    .number({ invalid_type_error: "Điểm tối đa phải là số" })
    .positive("Điểm tối đa phải lớn hơn 0"),
  weight: z.coerce
    .number({ invalid_type_error: "Trọng số phải là số" })
    .positive("Trọng số phải lớn hơn 0"),
});

export const createCriteriaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên tiêu chí không được để trống")
    .max(255, "Tên tiêu chí tối đa 255 ký tự"),
  description: z.string().trim().max(2000).optional().nullable(),
  maxScore: z.number().positive("Điểm tối đa phải lớn hơn 0"),
  weight: z.number().positive("Trọng số phải lớn hơn 0"),
});

export const updateCriteriaSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    maxScore: z.number().positive("Điểm tối đa phải lớn hơn 0").optional(),
    weight: z.number().positive("Trọng số phải lớn hơn 0").optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type TemplateFormInput = z.input<typeof templateFormSchema>;
export type TemplateFormData = z.output<typeof templateFormSchema>;
export type CriteriaFormInput = z.input<typeof criteriaFormSchema>;
export type CriteriaFormData = z.output<typeof criteriaFormSchema>;
