import editorial from "../data/editorial.json";
import archive from "../data/editorial-archive.json";
import { isWeeklyEditorialPublishable } from "../../scripts/lib/editorial.mjs";
import { createRssXml, rssResponse, uniqueWeeks } from "../lib/rss-feed.mjs";

export const prerender = true;

export function GET({ site }) {
  const currentGame = isWeeklyEditorialPublishable(editorial.gameWeekly)
    ? [editorial.gameWeekly]
    : [];
  const currentCard = isWeeklyEditorialPublishable(editorial.cardWeekly)
    ? [editorial.cardWeekly]
    : [];
  const gameItems = uniqueWeeks([...currentGame, ...(archive.weeks || [])]).map((week) => ({
    title: `【PR・ゲーム】${week.headline}`,
    summary: week.summary,
    href: `/articles/game-ranking/${week.weekKey}/`,
    publishedAt: week.publishedAt,
    updatedAt: week.updatedAt
  }));
  const cardWeeklyItems = uniqueWeeks([...currentCard, ...(archive.cardWeeks || [])]).map((week) => ({
    title: `【PR・カードゲーム】${week.headline}`,
    summary: week.summary,
    href: `/articles/card-game-ranking/${week.weekKey}/`,
    publishedAt: week.publishedAt,
    updatedAt: week.updatedAt
  }));
  const cardItems = [
    ...cardWeeklyItems,
    {
      title: "【PR・カードゲーム】ポケモンカードなどカードゲームランキングを見る",
      summary: editorial.cardWeekly.summary,
      href: "/categories/card-games/",
      publishedAt: editorial.cardWeekly.publishedAt,
      updatedAt: editorial.cardWeekly.updatedAt
    }
  ];
  const items = [...gameItems, ...cardItems]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const xml = createRssXml({
    title: "モノ上昇便 RSS",
    description: "ゲーム、カードゲーム、文房具のランキング順位変動を紹介するモノ上昇便の更新情報です。",
    site,
    feedPath: "/rss.xml",
    items
  });
  return rssResponse(xml);
}
