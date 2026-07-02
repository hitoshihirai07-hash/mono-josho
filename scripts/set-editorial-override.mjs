import fs from "node:fs/promises";
import { getJstWeekInfo } from "./lib/editorial.mjs";

const overridesPath = new URL("../src/data/editorial-overrides.json", import.meta.url);

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const value = (name) => (process.env[name] || "").trim();
const currentWeek = getJstWeekInfo(new Date()).weekKey;
const weekKey = value("WEEK_KEY") || currentWeek;
const clearOverride = value("CLEAR_OVERRIDE").toLowerCase() === "true";
const overrides = await readJson(overridesPath, { version: 1, weeks: {} });
overrides.version = 1;
overrides.weeks ||= {};

if (clearOverride) {
  delete overrides.weeks[weekKey];
  await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2) + "\n");
  console.log(`Removed editorial override for ${weekKey}.`);
  process.exit(0);
}

const headline = value("HEADLINE");
const summary = value("SUMMARY");
const points = [1, 2, 3]
  .map((index) => ({
    title: value(`POINT${index}_TITLE`),
    body: value(`POINT${index}_BODY`)
  }))
  .filter((point) => point.title || point.body);

for (const point of points) {
  if (!point.title || !point.body) {
    throw new Error("Each editorial point requires both a title and body.");
  }
}

if (!headline && !summary && points.length === 0) {
  throw new Error("Enter at least one override field or enable clear_override.");
}

overrides.weeks[weekKey] = {
  ...(overrides.weeks[weekKey] || {}),
  ...(headline ? { headline } : {}),
  ...(summary ? { summary } : {}),
  ...(points.length ? { points } : {}),
  updatedAt: new Date().toISOString()
};

await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2) + "\n");
console.log(`Saved editorial override for ${weekKey}.`);
