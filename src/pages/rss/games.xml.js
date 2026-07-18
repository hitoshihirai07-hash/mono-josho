import editorial from "../../data/editorial.json";
import archive from "../../data/editorial-archive.json";
import { isWeeklyEditorialPublishable } from "../../../scripts/lib/editorial.mjs";
import { createRssXml, rssResponse, uniqueWeeks } from "../../lib/rss-feed.mjs";

export const prerender = true;

export function GET({ site }) {
  const imageUrl = new URL("/brand/pinterest-games-weekly.png", site).toString();
  const current = isWeeklyEditorialPublishable(editorial.gameWeekly)
    ? [editorial.gameWeekly]
    : [];
  const weeks = uniqueWeeks([...current, ...(archive.weeks || [])]);
  const items = weeks.map((week) => ({
    title: `【PR】${week.headline}`,
    summary: week.summary,
    href: `/articles/game-ranking/${week.weekKey}/`,
    publishedAt: week.publishedAt,
    updatedAt: week.updatedAt,
    imageUrl
  }));
  const xml = createRssXml({
    title: "モノ上昇便｜ゲームランキングの週次変動",
    description: "Switch・PS5・PS4の新登場、順位上昇、値下がりを週別にまとめます。",
    site,
    feedPath: "/rss/games.xml",
    items
  });
  return rssResponse(xml);
}
