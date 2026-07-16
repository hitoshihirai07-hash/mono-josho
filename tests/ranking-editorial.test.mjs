import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  appendSnapshot,
  buildComparisonFields,
  compactSnapshot,
  findComparisonSnapshot
} from "../scripts/lib/ranking-history.mjs";
import {
  generateWeeklyEditorial,
  getJstWeekInfo,
  isWeeklyEditorialPublishable,
  rotateArchive,
  selectWeeklyPoints
} from "../scripts/lib/editorial.mjs";
import {
  getEnabledCategories,
  getEnabledRankingSources,
  getNavigationItems,
  validateCategoryConfig
} from "../scripts/lib/category-config.mjs";
import { selectTodayHighlights } from "../scripts/lib/highlights.mjs";
import { classifyGameProduct } from "../src/lib/game-classifier.mjs";
import { classifyCardGameProduct } from "../src/lib/card-game-classifier.mjs";

const categoryConfig = JSON.parse(
  await fs.readFile(new URL("../src/data/categories.json", import.meta.url), "utf8")
);

const sampleItems = [
  {
    sourceKey: "switch",
    code: "switch-rise",
    name: "Switch上昇ソフト",
    rank: 3,
    price: 5980,
    weekComparisonReady: true,
    weekPreviousRank: 18,
    weekDelta: 15,
    weekIsNew: false,
    weekPreviousPrice: 5980,
    weekPriceChange: 0
  },
  {
    sourceKey: "ps5",
    code: "ps5-drop",
    name: "PS5値下がりソフト",
    rank: 5,
    price: 6480,
    weekComparisonReady: true,
    weekPreviousRank: 6,
    weekDelta: 1,
    weekIsNew: false,
    weekPreviousPrice: 7980,
    weekPriceChange: -1500
  },
  {
    sourceKey: "ps4",
    code: "ps4-new",
    name: "PS4新登場ソフト",
    rank: 7,
    price: 3980,
    weekComparisonReady: true,
    weekPreviousRank: null,
    weekDelta: 0,
    weekIsNew: true,
    weekPreviousPrice: null,
    weekPriceChange: 0
  }
];

test("history keeps only the newest 30 successful snapshots", () => {
  let history = { version: 1, snapshots: [] };
  for (let index = 0; index < 35; index += 1) {
    history = appendSnapshot(
      history,
      compactSnapshot([], new Date(Date.UTC(2026, 0, 1, index)).toISOString()),
      30
    );
  }
  assert.equal(history.snapshots.length, 30);
});

test("24-hour and seven-day comparisons choose the nearest retained snapshot", () => {
  const now = "2026-07-08T03:00:00.000Z";
  const snapshots = [
    { fetchedAt: "2026-07-07T03:10:00.000Z", items: [] },
    { fetchedAt: "2026-07-01T03:05:00.000Z", items: [] }
  ];
  assert.equal(findComparisonSnapshot(snapshots, now, 24, 14)?.fetchedAt, snapshots[0].fetchedAt);
  assert.equal(findComparisonSnapshot(snapshots, now, 168, 48)?.fetchedAt, snapshots[1].fetchedAt);
});

test("first acquisition is comparison-pending instead of all NEW", () => {
  const fields = buildComparisonFields({
    sourceKey: "switch",
    code: "new-item",
    rank: 1,
    price: 5000,
    snapshot: null,
    prefix: "day"
  });
  assert.equal(fields.dayComparisonReady, false);
  assert.equal(fields.dayIsNew, false);
});

test("comparison fields report rank rise and price drop", () => {
  const snapshot = {
    fetchedAt: "2026-07-01T00:00:00.000Z",
    items: [{ sourceKey: "switch", code: "game", rank: 12, price: 7000 }]
  };
  const fields = buildComparisonFields({
    sourceKey: "switch",
    code: "game",
    rank: 4,
    price: 6000,
    snapshot,
    prefix: "week"
  });
  assert.equal(fields.weekComparisonReady, true);
  assert.equal(fields.weekDelta, 8);
  assert.equal(fields.weekPriceChange, -1000);
});

test("weekly editorial selects three concrete and non-duplicated movements", () => {
  const points = selectWeeklyPoints(sampleItems);
  assert.equal(points.length, 3);
  assert.equal(new Set(points.map((point) => point.itemCode)).size, 3);
  assert.match(points[0].body, /18位から3位/);
  assert.ok(points.some((point) => /¥1,500値下がり/.test(point.title)));
});

test("weekly override replaces automatic copy and qualifies for archiving", () => {
  const now = new Date("2026-07-02T03:00:00.000Z");
  const weekKey = getJstWeekInfo(now).weekKey;
  const overridePoints = [1, 2, 3].map((number) => ({
    title: `手動見出し${number}`,
    body: `手動本文${number}`
  }));
  const editorial = generateWeeklyEditorial(
    { updatedAt: now.toISOString(), items: sampleItems },
    { weeks: { [weekKey]: { headline: "手動見出し", summary: "手動要約", points: overridePoints } } },
    now
  );
  assert.equal(editorial.generationMode, "manual-override");
  assert.equal(editorial.headline, "手動見出し");
  assert.equal(editorial.archiveEligible, true);
});

test("week rollover archives only an eligible previous week", () => {
  const current = { weekKey: "2026-W26", archiveEligible: true, headline: "前週" };
  const next = { weekKey: "2026-W27", archiveEligible: false };
  const result = rotateArchive(current, next, { version: 1, weeks: [] });
  assert.equal(result.weeks.length, 1);
  assert.equal(result.weeks[0].weekKey, "2026-W26");
});

test("hidden attribute overrides change-row grid display", async () => {
  const css = await fs.readFile(new URL("../src/styles/overrides.css", import.meta.url), "utf8");
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("game classifier distinguishes type and overlapping product attributes", () => {
  const used = classifyGameProduct("【中古】PS4 SAND LAND", "", { sourceKey: "ps4" });
  assert.equal(used.itemTypeKey, "software");
  assert.deepEqual(used.gameAttributeKeys, ["used"]);

  const hardware = classifyGameProduct(
    "PlayStation5 デジタル・エディション DualSense ダブルパック",
    "",
    { sourceKey: "ps5" }
  );
  assert.equal(hardware.itemTypeKey, "hardware");
  assert.ok(hardware.gameAttributeKeys.includes("hardware-bundle"));
  const consoleSet = classifyGameProduct("Nintendo Switch 2 本体 マリオセット", "", {
    sourceKey: "games-overall"
  });
  assert.ok(consoleSet.gameAttributeKeys.includes("hardware-bundle"));

  const accessory = classifyGameProduct(
    "PlayStation5 DualSense ワイヤレスコントローラー",
    "",
    { sourceKey: "ps5" }
  );
  assert.equal(accessory.itemTypeKey, "accessory");

  const download = classifyGameProduct("Switch ダウンロード版 オンラインコード", "", {
    sourceKey: "switch"
  });
  assert.equal(download.itemTypeKey, "download");

  const bonus = classifyGameProduct(
    "【特典】Beast of Reincarnation（永久封入特典：プロダクトコード）",
    "",
    { sourceKey: "ps5" }
  );
  assert.equal(bonus.itemTypeKey, "software");
  assert.ok(bonus.gameAttributeKeys.includes("bonus"));

  const imported = classifyGameProduct("PS5 北米版 ゲームソフト", "", { sourceKey: "ps5" });
  assert.ok(imported.gameAttributeKeys.includes("imported"));

  const preorder = classifyGameProduct("【Switch】新作ゲーム 予約受付中", "", {
    sourceKey: "switch"
  });
  assert.ok(preorder.gameAttributeKeys.includes("preorder"));

  const newItem = classifyGameProduct("【新品】Nintendo Switch 2 本体", "", {
    sourceKey: "switch"
  });
  assert.equal(newItem.itemTypeKey, "hardware");
  assert.ok(!newItem.gameAttributeKeys.includes("used"));

  const multilingual = classifyGameProduct(
    "Nintendo Switch 2 本体 Multi-Language System",
    "",
    { sourceKey: "switch" }
  );
  assert.ok(!multilingual.gameAttributeKeys.includes("imported"));
});

test("category config exposes only enabled categories and verified sources", () => {
  assert.deepEqual(validateCategoryConfig(categoryConfig), []);
  assert.deepEqual(getEnabledCategories(categoryConfig).map((category) => category.id), [
    "games",
    "card-games",
    "stationery"
  ]);
  const rankingSources = getEnabledRankingSources(categoryConfig, {});
  assert.equal(rankingSources.length, 6);
  assert.equal(
    rankingSources.find((source) => source.sourceKey === "card-games")?.id,
    "207659"
  );
  assert.ok(getNavigationItems(categoryConfig).every((item) =>
    ["games", "switch", "ps5", "ps4", "card-games", "stationery"].includes(item.id)
  ));
});

test("card-game products are classified by work, product type and condition", () => {
  const pokemon = classifyCardGameProduct(
    "ポケモンカードゲーム 拡張パック 新品未開封 シュリンク付き 予約",
    ""
  );
  assert.equal(pokemon.cardFranchiseKey, "pokemon");
  assert.equal(pokemon.cardProductTypeKey, "box");
  assert.ok(pokemon.cardAttributeKeys.includes("preorder"));
  assert.ok(pokemon.cardAttributeKeys.includes("unopened"));

  const supply = classifyCardGameProduct("ポケモンカード BOX 保護ケース 10個セット", "");
  assert.equal(supply.cardProductTypeKey, "supply");

  const onePiece = classifyCardGameProduct("ONE PIECE カードゲーム スタートデッキ", "");
  assert.equal(onePiece.cardFranchiseKey, "one-piece");
  assert.equal(onePiece.cardProductTypeKey, "deck");
});

test("enabled category without a ranking source is rejected", () => {
  const broken = structuredClone(categoryConfig);
  broken.categories[0].sources.forEach((source) => {
    source.enabled = false;
  });
  assert.match(validateCategoryConfig(broken).join("\n"), /有効カテゴリに取得元がありません/);
});

test("today highlights prioritize two games and never backfill unchanged items", () => {
  const items = [
    {
      categoryKey: "stationery",
      sourceKey: "stationery",
      code: "stationery-rise",
      dayComparisonReady: true,
      dayDelta: 20,
      dayPriceChange: 0,
      rank: 1
    },
    {
      categoryKey: "games",
      sourceKey: "switch",
      code: "game-one",
      dayComparisonReady: true,
      dayDelta: 4,
      dayPriceChange: 0,
      rank: 5
    },
    {
      categoryKey: "games",
      sourceKey: "ps5",
      code: "game-two",
      dayComparisonReady: true,
      dayDelta: 2,
      dayPriceChange: 0,
      rank: 8
    },
    {
      categoryKey: "games",
      sourceKey: "ps4",
      code: "unchanged",
      dayComparisonReady: true,
      dayDelta: 0,
      dayPriceChange: 0,
      rank: 1
    }
  ];
  const selected = selectTodayHighlights(items, 3);
  assert.equal(selected.filter((item) => item.categoryKey === "games").length, 2);
  assert.ok(!selected.some((item) => item.code === "unchanged"));
});

test("weekly article is published only for the current week with three real points", () => {
  const now = new Date("2026-07-02T03:00:00.000Z");
  const generated = generateWeeklyEditorial(
    { updatedAt: now.toISOString(), items: sampleItems },
    {},
    now
  );
  assert.equal(isWeeklyEditorialPublishable(generated, now), true);
  assert.equal(isWeeklyEditorialPublishable({ ...generated, points: generated.points.slice(0, 2) }, now), false);
  assert.equal(isWeeklyEditorialPublishable({ ...generated, weekKey: "2026-W01" }, now), false);
});
