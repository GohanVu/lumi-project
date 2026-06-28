import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

/** Đồng bộ mọi nơi có thể hiển thị điểm hiệu lực sau khi Admin điều chỉnh. */
export async function invalidateScoreOverride(
  queryClient: QueryClient,
  companyId: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.scores(companyId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}
