import editorial from "../../data/editorial.json";
import archive from "../../data/editorial-archive.json";
import { isWeeklyEditorialPublishable } from "../../../scripts/lib/editorial.mjs";
import { createRssXml, rssResponse, uniqueWeeks } from "../../lib/rss-feed.mjs";

export const prerender = true;

export function GET({ site }) {
  const current = isWeeklyEditorialPublishable(editorial.cardWeekly)
    ? [editorial.cardWeekly]
    : [];
  const weeks = uniqueWeeks([...current, ...(archive.cardWeeks || [])]);
  const weeklyItems = weeks.map((week) => ({
    title: `【PR】${week.headline}`,
    summary: week.summary,
    href: `/articles/card-game-ranking/${week.weekKey}/`,
    publishedAt: week.publishedAt,
    updatedAt: week.updatedAt
  }));
  const items = [
    ...weeklyItems,
    {
      title: "【PR】ポケモンカードなどカードゲームランキングを見る",
      summary: editorial.cardWeekly.summary,
      href: "/categories/card-games/",
      publishedAt: editorial.cardWeekly.publishedAt,
      updatedAt: editorial.cardWeekly.updatedAt
    }
  ];
  const xml = createRssXml({
    title: "モノ上昇便｜カードゲームランキングの週次変動",
    description: "ポケモンカードなど、カードゲームの新登場、順位上昇、値下がりを週別にまとめます。",
    site,
    feedPath: "/rss/card-games.xml",
    items
  });
  return rssResponse(xml);
}
