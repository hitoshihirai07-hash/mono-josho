import assert from "node:assert/strict";
import test from "node:test";
import { createRssXml, uniqueWeeks } from "../src/lib/rss-feed.mjs";

test("RSS 2.0としてPinterestに必要な画像と認証ドメインのリンクを出力する", () => {
  const xml = createRssXml({
    title: "モノ上昇便 & RSS",
    description: "ランキング <更新>",
    site: new URL("https://mono-josho.pages.dev"),
    feedPath: "/rss/games.xml",
    items: [{
      title: "【PR】ゲーム & カード",
      summary: "順位 <上昇>",
      href: "/articles/game-ranking/2026-W29/",
      publishedAt: "2026-07-13T00:00:00+09:00",
      updatedAt: "2026-07-18T06:05:57.211Z"
    }]
  });

  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /xmlns:media=/);
  assert.match(xml, /<media:content url="https:\/\/mono-josho\.pages\.dev\/brand\/header\.png"/);
  assert.match(xml, /<link>https:\/\/mono-josho\.pages\.dev\/articles\/game-ranking\/2026-W29\/<\/link>/);
  assert.match(xml, /モノ上昇便 &amp; RSS/);
  assert.match(xml, /順位 &lt;上昇&gt;/);
  assert.doesNotMatch(xml, /rakuten\.co\.jp/);
});

test("公開条件を満たす週だけを重複なし・新しい順に返す", () => {
  const complete = (weekKey) => ({
    weekKey,
    archiveEligible: true,
    points: [{}, {}, {}]
  });
  const weeks = uniqueWeeks([
    complete("2026-W28"),
    complete("2026-W29"),
    complete("2026-W29"),
    { ...complete("2026-W30"), archiveEligible: false }
  ]);

  assert.deepEqual(weeks.map((week) => week.weekKey), ["2026-W29", "2026-W28"]);
});
