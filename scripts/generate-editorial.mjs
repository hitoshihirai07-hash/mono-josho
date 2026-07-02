import fs from "node:fs/promises";
import { generateWeeklyEditorial, rotateArchive } from "./lib/editorial.mjs";

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
const current = await readJson(editorialPath, { gameWeekly: null });
const overrides = await readJson(overridesPath, { version: 1, weeks: {} });
const archive = await readJson(archivePath, { version: 1, weeks: [] });
const nextWeekly = generateWeeklyEditorial(ranking, overrides, new Date());
const nextArchive = rotateArchive(current.gameWeekly, nextWeekly, archive);

await fs.writeFile(editorialPath, JSON.stringify({ gameWeekly: nextWeekly }, null, 2) + "\n");
await fs.writeFile(archivePath, JSON.stringify(nextArchive, null, 2) + "\n");

console.log(
  `Generated ${nextWeekly.weekKey} weekly editorial (${nextWeekly.generationMode}, archiveEligible=${nextWeekly.archiveEligible}).`
);
