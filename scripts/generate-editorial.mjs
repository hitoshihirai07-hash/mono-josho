import fs from "node:fs/promises";
import {
  generateCardWeeklyEditorial,
  generateWeeklyEditorial,
  rotateArchive
} from "./lib/editorial.mjs";

const rankingPath = new URL("../src/data/ranking.json", import.meta.url);
const editorialPath = new URL("../src/data/editorial.json", import.meta.url);
const overridesPath = new URL("../src/data/editorial-overrides.json", import.meta.url);
const archivePath = new URL("../src/data/editorial-archive.json", import.meta.url);

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const ranking = await readJson(rankingPath, { status: "preparing", items: [] });
const current = await readJson(editorialPath, { gameWeekly: null, cardWeekly: null });
const overrides = await readJson(overridesPath, { version: 1, weeks: {} });
const archive = await readJson(archivePath, { version: 2, weeks: [], cardWeeks: [] });
const now = new Date();
const nextWeekly = generateWeeklyEditorial(ranking, overrides, now);
const nextCardWeekly = generateCardWeeklyEditorial(ranking, now);
const nextGameArchive = rotateArchive(current.gameWeekly, nextWeekly, {
  version: 1,
  weeks: archive.weeks || []
});
const nextCardArchive = rotateArchive(current.cardWeekly, nextCardWeekly, {
  version: 1,
  weeks: archive.cardWeeks || []
});
const nextArchive = {
  ...archive,
  version: 2,
  weeks: nextGameArchive.weeks,
  cardWeeks: nextCardArchive.weeks
};

await fs.writeFile(
  editorialPath,
  JSON.stringify({ gameWeekly: nextWeekly, cardWeekly: nextCardWeekly }, null, 2) + "\n"
);
await fs.writeFile(archivePath, JSON.stringify(nextArchive, null, 2) + "\n");

console.log(
  `Generated ${nextWeekly.weekKey} weekly editorials ` +
  `(game=${nextWeekly.archiveEligible}, card=${nextCardWeekly.archiveEligible}).`
);
