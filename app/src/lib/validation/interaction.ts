import { z } from "zod";

export const interactionTypeSchema = z.enum([
  "CALL",
  "VISIT",
  "EMAIL",
  "MEETING",
  "ZALO",
  "OTHER",
]);

export const interactionFormSchema = z.object({
  type: interactionTypeSchema,
  content: z
    .string()
    .trim()
    .min(1, "Nội dung tương tác không được để trống")
    .max(5000),
  result: z.string().trim().max(2000).optional().or(z.literal("")),
  contactName: z.string().trim().max(255).optional().or(z.literal("")),
  followUpAt: z
    .string()
    .refine(
      (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
      "Thời gian follow-up không hợp lệ"
    ),
});

export const createInteractionSchema = z.object({
  type: interactionTypeSchema,
  content: z
    .string()
    .trim()
    .min(1, "Nội dung tương tác không được để trống")
    .max(5000),
  result: z.string().trim().max(2000).optional().nullable(),
  contactName: z.string().trim().max(255).optional().nullable(),
  followUpAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export type InteractionType = z.infer<typeof interactionTypeSchema>;
export type InteractionFormInput = z.input<typeof interactionFormSchema>;
export type InteractionFormData = z.output<typeof interactionFormSchema>;
