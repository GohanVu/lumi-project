import { z } from "zod";

export const missingDataPolicySchema = z.enum(["EXCLUDE", "ZERO", "BLOCK"]);

export const scoreDetailInputSchema = z.object({
  criteriaId: z.string().min(1),
  score: z.number().finite().min(0).nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const createScoreResultSchema = z
  .object({
    templateId: z.string().min(1, "Phải chọn mẫu chấm điểm"),
    missingDataPolicy: missingDataPolicySchema.default("EXCLUDE"),
    details: z.array(scoreDetailInputSchema).min(1),
  })
  .superRefine((data, context) => {
    const ids = new Set<string>();
    for (const detail of data.details) {
      if (ids.has(detail.criteriaId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tiêu chí bị trùng",
          path: ["details"],
        });
        break;
      }
      ids.add(detail.criteriaId);
    }

    if (!data.details.some((detail) => detail.score !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phải nhập điểm cho ít nhất một tiêu chí",
        path: ["details"],
      });
    }
  });

const scoreTextSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Điểm phải là số không âm"
  );

export const scoreFormSchema = z
  .object({
    missingDataPolicy: missingDataPolicySchema,
    details: z.array(
      z.object({
        criteriaId: z.string().min(1),
        score: scoreTextSchema,
        note: z.string().trim().max(2000).optional().or(z.literal("")),
      })
    ),
  })
  .refine((data) => data.details.some((detail) => detail.score !== ""), {
    message: "Phải nhập điểm cho ít nhất một tiêu chí",
    path: ["details"],
  });

export const overrideScoreSchema = z.object({
  score: z
    .number({ required_error: "Phải nhập điểm điều chỉnh" })
    .finite("Điểm điều chỉnh phải là số hợp lệ")
    .min(0, "Điểm điều chỉnh phải từ 0 đến 100")
    .max(100, "Điểm điều chỉnh phải từ 0 đến 100"),
  reason: z
    .string()
    .trim()
    .min(5, "Lý do phải có ít nhất 5 ký tự")
    .max(2000, "Lý do không được quá 2000 ký tự"),
});

export const overrideScoreFormSchema = z.object({
  score: z
    .string()
    .trim()
    .min(1, "Phải nhập điểm điều chỉnh")
    .refine(
      (value) =>
        Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
      "Điểm điều chỉnh phải từ 0 đến 100"
    ),
  reason: overrideScoreSchema.shape.reason,
});

export type MissingDataPolicy = z.infer<typeof missingDataPolicySchema>;
export type ScoreFormInput = z.input<typeof scoreFormSchema>;
export type ScoreFormData = z.output<typeof scoreFormSchema>;
export type OverrideScoreFormInput = z.input<typeof overrideScoreFormSchema>;
export type OverrideScoreFormData = z.output<typeof overrideScoreFormSchema>;
