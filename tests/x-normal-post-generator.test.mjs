import assert from "node:assert/strict";
import test from "node:test";
import {
  X_NORMAL_POST_THEMES,
  generateNormalXPost,
  generateNormalXPostOptions
} from "../scripts/lib/x-normal-post-generator.mjs";

test("night normal post generator returns link-free text within X limit", () => {
  const result = generateNormalXPost({ themeKey: "auto", seed: 2 });
  assert.equal(result.status, "ready");
  assert.ok(result.weightedLength <= 280);
  assert.doesNotMatch(result.text, /https?:\/\//);
  assert.doesNotMatch(result.text, /#/);
});

test("night normal post generator filters by requested theme", () => {
  for (const theme of X_NORMAL_POST_THEMES) {
    const result = generateNormalXPostOptions({ themeKey: theme.key, limit: 3, seed: 1 });
    assert.equal(result.status, "ready");
    assert.ok(result.items.every((item) => item.themeKey === theme.key));
  }
});

test("night normal post generator avoids recorded templates while alternatives remain", () => {
  const initial = generateNormalXPostOptions({ themeKey: "ranking-view", limit: 3, seed: 4 });
  const excluded = initial.items.slice(0, 2).map((item) => item.id);
  const result = generateNormalXPostOptions({
    themeKey: "ranking-view",
    limit: 1,
    excludeTemplateIds: excluded,
    seed: 4
  });
  assert.equal(result.status, "ready");
  assert.ok(!excluded.includes(result.items[0].id));
});
