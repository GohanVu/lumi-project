import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { companyQueryKeys, invalidateCompanyLists } from "./company-queries";

test("creating a company invalidates every cached company list", async () => {
  const queryClient = new QueryClient();
  const detailKey = companyQueryKeys.detail("company-1");
  const firstPageKey = companyQueryKeys.list({
    page: 1,
    search: "",
    status: "",
  });
  const filteredPageKey = companyQueryKeys.list({
    page: 2,
    search: "Lumi",
    status: "ACTIVE",
  });

  queryClient.setQueryData(firstPageKey, { data: [] });
  queryClient.setQueryData(filteredPageKey, { data: [] });
  queryClient.setQueryData(detailKey, { id: "company-1" });

  await invalidateCompanyLists(queryClient);

  assert.equal(
    queryClient.getQueryCache().find({ queryKey: firstPageKey, exact: true })
      ?.state.isInvalidated,
    true
  );
  assert.equal(
    queryClient.getQueryCache().find({ queryKey: filteredPageKey, exact: true })
      ?.state.isInvalidated,
    true
  );
  assert.equal(
    queryClient.getQueryCache().find({ queryKey: detailKey, exact: true })
      ?.state.isInvalidated,
    false,
    "creating a company should invalidate lists without expiring unrelated details"
  );
});
