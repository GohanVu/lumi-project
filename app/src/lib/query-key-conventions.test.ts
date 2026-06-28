import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function findSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return findSourceFiles(path);
    if (!entry.name.match(/\.(ts|tsx)$/) || entry.name.endsWith(".test.ts")) {
      return [];
    }

    return [path];
  });
}

test("application code uses the centralized query-key factory", () => {
  const sourceRoot = join(process.cwd(), "src");
  const violations = findSourceFiles(sourceRoot)
    .filter((file) => /queryKey\s*:\s*\[/.test(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file));

  assert.deepEqual(
    violations,
    [],
    `Raw query keys found; add them to src/lib/query-keys.ts: ${violations.join(", ")}`
  );
});
