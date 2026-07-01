import { z } from "zod";

export const companyStatusSchema = z.enum([
  "PROSPECT",
  "CONTACTING",
  "NEGOTIATING",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
]);

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().nullable();

const companyFields = {
  name: z
    .string()
    .trim()
    .min(1, "Tên NPP không được để trống")
    .max(255, "Tên NPP tối đa 255 ký tự"),
  taxCode: optionalText(20, "Mã số thuế tối đa 20 ký tự"),
  phone: optionalText(20, "Số điện thoại tối đa 20 ký tự"),
  email: z
    .string()
    .trim()
    .max(255, "Email tối đa 255 ký tự")
    .email("Email không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: optionalText(500, "Địa chỉ tối đa 500 ký tự"),
  province: optionalText(100, "Tỉnh/Thành phố tối đa 100 ký tự"),
  district: optionalText(100, "Quận/Huyện tối đa 100 ký tự"),
  ward: optionalText(100, "Phường/Xã tối đa 100 ký tự"),
  source: optionalText(255, "Nguồn giới thiệu tối đa 255 ký tự"),
  notes: optionalText(2000, "Ghi chú tối đa 2000 ký tự"),
};

export const companyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  status: companyStatusSchema.optional(),
  sortBy: z.enum(["name", "createdAt", "status", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const createCompanySchema = z.object({
  ...companyFields,
  status: companyStatusSchema.default("PROSPECT"),
  assignedToId: z.string().trim().optional().nullable(),
});

export const companyFormSchema = createCompanySchema.extend({
  status: companyStatusSchema,
  assignedToId: z.string().trim().min(1, "Phải chọn ASM phụ trách"),
});

export const updateCompanySchema = z
  .object({
    name: companyFields.name.optional(),
    taxCode: companyFields.taxCode,
    phone: companyFields.phone,
    email: companyFields.email,
    address: companyFields.address,
    province: companyFields.province,
    district: companyFields.district,
    ward: companyFields.ward,
    status: companyStatusSchema.optional(),
    source: companyFields.source,
    notes: companyFields.notes,
    assignedToId: z.string().trim().min(1, "ASM phụ trách không hợp lệ").optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type CompanyFormData = z.output<typeof companyFormSchema>;
