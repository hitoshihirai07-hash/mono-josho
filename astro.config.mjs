import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";

const archive = JSON.parse(
  fs.readFileSync(new URL("./src/data/editorial-archive.json", import.meta.url), "utf8")
);
const hasPublishedArchive = (archive.weeks || []).some((week) =>
  week.archiveEligible && Array.isArray(week.points) && week.points.length === 3
);

export default defineConfig({
  site: process.env.SITE_URL || "https://mono-josho.pages.dev",
  integrations: [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname;
      if (pathname.startsWith("/admin/")) return false;
      if (pathname === "/articles/current-game-ranking/") return false;
      if (pathname === "/articles/weekly-rising-stationery/") return false;
      if (pathname === "/articles/" && !hasPublishedArchive) return false;
      return true;
    }
  })],
  output: "static"
});
