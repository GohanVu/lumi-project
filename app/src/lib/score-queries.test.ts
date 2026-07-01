import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import {
  invalidateScoreOverride,
  invalidateScoreTemplateAvailability,
} from "./score-queries";

test("overriding a score invalidates company scores and dashboard aggregates", async () => {
  const queryClient = new QueryClient();
  const scoresKey = queryKeys.companies.scores("company-1");
  const dashboardKey = queryKeys.dashboard.all;
  const detailKey = queryKeys.companies.detail("company-1");

  queryClient.setQueryData(scoresKey, { data: [] });
  queryClient.setQueryData(dashboardKey, { totalCompanies: 1 });
  queryClient.setQueryData(detailKey, { id: "company-1" });

  await invalidateScoreOverride(queryClient, "company-1");

  assert.equal(
    queryClient.getQueryCache().find({ queryKey: scoresKey, exact: true })?.state
      .isInvalidated,
    true
  );
  assert.equal(
    queryClient.getQueryCache().find({ queryKey: dashboardKey, exact: true })?.state
      .isInvalidated,
    true
  );
  assert.equal(
    queryClient.getQueryCache().find({ queryKey: detailKey, exact: true })?.state
      .isInvalidated,
    false
  );
});

test("publishing or archiving a template invalidates every score view", async () => {
  const queryClient = new QueryClient();
  const templateListKey = queryKeys.scoreTemplates.all;
  const templateDetailKey = queryKeys.scoreTemplates.detail("template-1");
  const firstCompanyScoresKey = queryKeys.companies.scores("company-1");
  const secondCompanyScoresKey = queryKeys.companies.scores("company-2");

  queryClient.setQueryData(templateListKey, { data: [] });
  queryClient.setQueryData(templateDetailKey, { id: "template-1" });
  queryClient.setQueryData(firstCompanyScoresKey, { availableTemplates: [] });
  queryClient.setQueryData(secondCompanyScoresKey, { availableTemplates: [] });

  await invalidateScoreTemplateAvailability(queryClient, "template-1");

  for (const key of [
    templateListKey,
    templateDetailKey,
    firstCompanyScoresKey,
    secondCompanyScoresKey,
  ]) {
    assert.equal(
      queryClient.getQueryCache().find({ queryKey: key, exact: true })?.state.isInvalidated,
      true
    );
  }
});
