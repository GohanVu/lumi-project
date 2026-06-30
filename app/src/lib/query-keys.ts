export interface CompanyListFilters {
  page: number;
  search: string;
  status: string;
}

const companyListsKey = ["companies"] as const;
const scoreTemplatesKey = ["score-templates"] as const;

/**
 * Nguồn duy nhất cho TanStack Query keys.
 * Query và mutation phải cùng dùng factory này để invalidation không lệch key.
 */
export const queryKeys = {
  companies: {
    lists: companyListsKey,
    list: (filters: CompanyListFilters) => [...companyListsKey, filters] as const,
    detail: (companyId: string) => ["company", companyId] as const,
    contacts: (companyId: string) => ["contacts", companyId] as const,
    interactions: (companyId: string) => ["interactions", companyId] as const,
    tasks: (companyId: string) => ["tasks", companyId] as const,
    scores: (companyId: string) => ["scores", companyId] as const,
    attachments: (companyId: string) => ["attachments", companyId] as const,
  },
  scoreTemplates: {
    all: scoreTemplatesKey,
    detail: (templateId: string) => ["score-template", templateId] as const,
  },
  users: {
    all: ["users"] as const,
    manage: ["users", "manage"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
  },
} as const;
