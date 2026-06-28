import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export const companyQueryKeys = queryKeys.companies;

export async function invalidateCompanyLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: companyQueryKeys.lists });
}
