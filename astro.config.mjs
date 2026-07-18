import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import { isWeeklyEditorialPublishable } from "./scripts/lib/editorial.mjs";

const archive = JSON.parse(
  fs.readFileSync(new URL("./src/data/editorial-archive.json", import.meta.url), "utf8")
);
const editorial = JSON.parse(
  fs.readFileSync(new URL("./src/data/editorial.json", import.meta.url), "utf8")
);
const hasPublishedArchive = [...(archive.weeks || []), ...(archive.cardWeeks || [])]
  .some((week) => week.archiveEligible && Array.isArray(week.points) && week.points.length === 3);
const hasPublishedArticles = hasPublishedArchive ||
  isWeeklyEditorialPublishable(editorial.gameWeekly) ||
  isWeeklyEditorialPublishable(editorial.cardWeekly);

export default defineConfig({
  site: process.env.SITE_URL || "https://mono-josho.pages.dev",
  integrations: [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname;
      if (pathname.startsWith("/admin/")) return false;
      if (pathname === "/rss.xml" || pathname.startsWith("/rss/")) return false;
      if (pathname === "/articles/current-game-ranking/") return false;
      if (pathname === "/articles/weekly-rising-stationery/") return false;
      if (pathname === "/articles/" && !hasPublishedArticles) return false;
      return true;
    }
  })],
  output: "static"
});
