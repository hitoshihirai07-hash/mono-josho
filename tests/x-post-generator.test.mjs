import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  generateXPost,
  weightedXLength
} from "../scripts/lib/x-post-generator.mjs";

const ranking = JSON.parse(
  await fs.readFile(new URL("./fixtures/ranking-sample.json", import.meta.url), "utf8")
);

test("X post generator uses real 24-hour game movements and stays within 280", () => {
  const result = generateXPost(ranking, {
    window: "day",
    source: "games",
    kind: "auto",
    limit: 3
  });
  assert.equal(result.status, "ready");
  assert.ok(result.selectedCount >= 1 && result.selectedCount <= 3);
  assert.match(result.text, /【ゲームランキング｜24時間変動】/);
  assert.match(result.text, /位→|新登場|値下げ|値下がり/);
  assert.ok(result.weightedLength <= 280);
});

test("X post generator filters source and change type", () => {
  const result = generateXPost(ranking, {
    window: "day",
    source: "stationery",
    kind: "price-drop",
    limit: 3
  });
  assert.equal(result.status, "ready");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sourceKey, "stationery");
  assert.match(result.text, /300円値下がり/);
});

test("all-category post prioritizes at least two game items when available", () => {
  const result = generateXPost(ranking, {
    window: "day",
    source: "all",
    kind: "auto",
    limit: 3
  });
  assert.equal(result.status, "ready");
  assert.ok(result.items.filter((item) => ["switch", "ps5", "ps4"].includes(item.sourceKey)).length >= 2);
});

test("URL is counted as 23 characters and long posts are reduced automatically", () => {
  assert.equal(weightedXLength("https://mono-josho.pages.dev/games/"), 23);
  const longRanking = {
    items: Array.from({ length: 3 }, (_, index) => ({
      code: `long-${index}`,
      name: "非常に長い商品名が続く限定版ゲームソフト特典付き予約商品テスト",
      categoryKey: "games",
      sourceKey: index === 0 ? "switch" : index === 1 ? "ps5" : "ps4",
      rank: index + 1,
      dayComparisonReady: true,
      dayPreviousRank: 30,
      dayDelta: 29 - index,
      dayIsNew: false,
      dayPreviousPrice: 9980,
      dayPriceChange: -2000
    }))
  };
  const result = generateXPost(longRanking, {
    window: "day",
    source: "games",
    kind: "auto",
    limit: 3,
    includeLink: true,
    includeHashtag: true
  });
  assert.ok(result.weightedLength <= 280);
  assert.match(result.text, /https:\/\/mono-josho\.pages\.dev\/games\//);
});

test("generator returns an empty state when comparison data is unavailable", () => {
  const result = generateXPost(
    { items: [{ sourceKey: "switch", categoryKey: "games", name: "商品", rank: 1 }] },
    { window: "day", source: "games", kind: "auto" }
  );
  assert.equal(result.status, "empty");
  assert.equal(result.text, "");
  assert.equal(result.selectedCount, 0);
});
