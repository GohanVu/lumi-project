import { z } from "zod";

export const contactInfluenceSchema = z.enum(["high", "medium", "low"]);

export const contactFormSchema = z.object({
  fullName: z.string().trim().min(1, "Tên không được để trống").max(255),
  position: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
  isPrimary: z.boolean(),
  influence: contactInfluenceSchema.optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const createContactSchema = contactFormSchema.extend({
  isPrimary: z.boolean().default(false),
});

export const updateContactSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255).optional(),
    position: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    email: z.string().trim().email().optional().nullable().or(z.literal("")),
    isPrimary: z.boolean().optional(),
    influence: contactInfluenceSchema.optional().nullable().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type ContactInfluence = z.infer<typeof contactInfluenceSchema>;
export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormData = z.output<typeof contactFormSchema>;
