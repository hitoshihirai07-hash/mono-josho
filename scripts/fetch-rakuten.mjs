import fs from "node:fs/promises";
import {
  appendSnapshot,
  buildComparisonFields,
  compactSnapshot,
  findComparisonSnapshot
} from "./lib/ranking-history.mjs";
import { getEnabledRankingSources } from "./lib/category-config.mjs";
import { classifyGameProduct } from "../src/lib/game-classifier.mjs";

const appId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const siteUrl = process.env.SITE_URL || "https://mono-josho.pages.dev/";

const categoryConfigPath = new URL("../src/data/categories.json", import.meta.url);
const categoryConfig = JSON.parse(await fs.readFile(categoryConfigPath, "utf8"));
const genres = getEnabledRankingSources(categoryConfig, process.env);

const requestDelayMs = Number(process.env.RAKUTEN_REQUEST_DELAY_MS || 1200);
const maxRetries = Number(process.env.RAKUTEN_MAX_RETRIES || 4);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getRetryDelayMs(response, body = "") {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.ceil(retryAfter * 1000);
  }

  const messageDelay = body.match(/Try again in\s+(\d+(?:\.\d+)?)\s+seconds?/i);
  if (messageDelay) {
    return Math.ceil(Number(messageDelay[1]) * 1000);
  }

  return requestDelayMs;
}

if (!appId || !accessKey) {
  console.log("Rakuten credentials are not configured; keeping preparing state.");
  process.exit(0);
}

const previousPath = new URL("../src/data/ranking.json", import.meta.url);
const historyPath = new URL("../src/data/ranking-history.json", import.meta.url);
let previous = { items: [] };
try { previous = JSON.parse(await fs.readFile(previousPath, "utf8")); } catch {}
let history = { version: 1, snapshots: [] };
try { history = JSON.parse(await fs.readFile(historyPath, "utf8")); } catch {}
const nowIso = new Date().toISOString();
const daySnapshot = findComparisonSnapshot(history.snapshots, nowIso, 24, 14);
const weekSnapshot = findComparisonSnapshot(history.snapshots, nowIso, 24 * 7, 48);
const previousSourceKeys = new Set(
  previous.items.map((item) => item.sourceKey || item.categoryKey || "unknown")
);
const previousItems = new Map(
  previous.items.map((item) => [`${item.sourceKey || item.categoryKey || "unknown"}:${item.code}`, item])
);

async function fetchGenre(genre) {
  const url = new URL("https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("genreId", genre.id);
  url.searchParams.set("period", "realtime");
  url.searchParams.set("formatVersion", "2");
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);

  let response;
  let errorText = "";

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    response = await fetch(url, {
      headers: {
        Referer: siteUrl,
        Origin: new URL(siteUrl).origin
      },
      referrer: siteUrl,
      referrerPolicy: "no-referrer-when-downgrade"
    });

    if (response.ok) {
      break;
    }

    errorText = await response.text();
    if (response.status !== 429 || attempt === maxRetries) {
      throw new Error(`Rakuten API failed for ${genre.sourceLabel}: ${response.status} ${errorText}`);
    }

    const retryDelayMs = Math.max(getRetryDelayMs(response, errorText), requestDelayMs);
    console.warn(
      `Rakuten API rate limited for ${genre.sourceLabel}; retrying in ${Math.ceil(retryDelayMs / 1000)}s (${attempt + 1}/${maxRetries}).`
    );
    await sleep(retryDelayMs);
  }

  const payload = await response.json();
  const sourceItems = payload.Items || payload.items || [];
  return sourceItems
    .map((raw) => raw.Item || raw)
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .slice(0, 30)
    .map((item) => {
      const previousKey = `${genre.sourceKey}:${item.itemCode}`;
      const previousItem = previousItems.get(previousKey);
      const oldRank = previousItem?.rank;
      const oldPrice = Number(previousItem?.price);
      const currentPrice = Number(item.itemPrice);
      const hasPreviousPrice = Number.isFinite(oldPrice) && oldPrice > 0;
      const previousComparisonReady = previousSourceKeys.has(genre.sourceKey);
      const gameMeta = genre.key === "games"
        ? {
            ...(genre.platformKey && genre.platformLabel
              ? { platformKey: genre.platformKey, platformLabel: genre.platformLabel }
              : {}),
            ...classifyGameProduct(item.itemName, item.itemCaption || "", {
              sourceKey: genre.sourceKey
            })
          }
        : {};

      return {
        code: item.itemCode,
        rank: Number(item.rank),
        previousRank: oldRank || null,
        delta: oldRank ? oldRank - Number(item.rank) : 0,
        isNew: previousComparisonReady && !previousItem,
        previousComparisonReady,
        name: item.itemName,
        price: currentPrice,
        previousPrice: hasPreviousPrice ? oldPrice : null,
        priceChange: hasPreviousPrice ? currentPrice - oldPrice : null,
        ...buildComparisonFields({
          sourceKey: genre.sourceKey,
          code: item.itemCode,
          rank: Number(item.rank),
          price: currentPrice,
          snapshot: daySnapshot,
          prefix: "day"
        }),
        ...buildComparisonFields({
          sourceKey: genre.sourceKey,
          code: item.itemCode,
          rank: Number(item.rank),
          price: currentPrice,
          snapshot: weekSnapshot,
          prefix: "week"
        }),
        image: item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || "",
        reviewAverage: item.reviewAverage || null,
        reviewCount: Number(item.reviewCount || 0),
        category: genre.label,
        categoryKey: genre.key,
        sourceKey: genre.sourceKey,
        sourceLabel: genre.sourceLabel,
        genreId: genre.id,
        ...gameMeta,
        url: item.itemUrl,
        affiliateUrl: item.affiliateUrl || item.itemUrl,
        shopName: item.shopName || "楽天市場",
        fetchedAt: nowIso
      };
    });
}

const items = [];
for (const [index, genre] of genres.entries()) {
  const genreItems = await fetchGenre(genre);
  items.push(...genreItems);

  if (index < genres.length - 1) {
    await sleep(requestDelayMs);
  }
}

const nextRanking = {
  updatedAt: nowIso,
  status: "ready",
  items
};
const nextHistory = appendSnapshot(history, compactSnapshot(items, nowIso), 30);

await fs.writeFile(previousPath, JSON.stringify(nextRanking, null, 2) + "\n");
await fs.writeFile(historyPath, JSON.stringify(nextHistory, null, 2) + "\n");
console.log(`Saved ${items.length} Rakuten ranking items across ${genres.length} ranking sources.`);
