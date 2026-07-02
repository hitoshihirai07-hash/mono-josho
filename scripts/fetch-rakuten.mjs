import fs from "node:fs/promises";
import {
  appendSnapshot,
  buildComparisonFields,
  compactSnapshot,
  findComparisonSnapshot
} from "./lib/ranking-history.mjs";

const appId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const siteUrl = process.env.SITE_URL || "https://mono-josho.pages.dev/";

const genres = [
  {
    id: process.env.RAKUTEN_GENRE_ID || "100901",
    key: "stationery",
    label: "文房具・事務用品",
    sourceKey: "stationery",
    sourceLabel: "文房具・事務用品ランキング"
  },
  {
    id: process.env.RAKUTEN_GAME_GENRE_ID || "101205",
    key: "games",
    label: "テレビゲーム",
    sourceKey: "games-overall",
    sourceLabel: "テレビゲーム総合ランキング",
    platformKey: "overall",
    platformLabel: "テレビゲーム総合"
  },
  {
    id: process.env.RAKUTEN_SWITCH_GENRE_ID || "565950",
    key: "games",
    label: "Nintendo Switch",
    sourceKey: "switch",
    sourceLabel: "Nintendo Switchランキング",
    platformKey: "switch",
    platformLabel: "Nintendo Switch"
  },
  {
    id: process.env.RAKUTEN_PS5_GENRE_ID || "568375",
    key: "games",
    label: "プレイステーション5",
    sourceKey: "ps5",
    sourceLabel: "PlayStation 5ランキング",
    platformKey: "playstation",
    platformLabel: "PlayStation 5"
  },
  {
    id: process.env.RAKUTEN_PS4_GENRE_ID || "563544",
    key: "games",
    label: "プレイステーション4",
    sourceKey: "ps4",
    sourceLabel: "PlayStation 4ランキング",
    platformKey: "playstation",
    platformLabel: "PlayStation 4"
  }
];

const toComparableText = (value = "") =>
  value.toString().toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

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

function detectGamePlatform(name = "") {
  const text = toComparableText(name);

  if (/(nintendo switch|switch|スイッチ|任天堂|joy-con|joycon|プロコン)/.test(text)) {
    return { platformKey: "switch", platformLabel: "Nintendo Switch" };
  }

  if (/(playstation|プレイステーション|プレステ|ps5|ps 5|ps4|ps 4|dualshock|dualsense)/.test(text)) {
    return { platformKey: "playstation", platformLabel: "PlayStation" };
  }

  return { platformKey: "overall", platformLabel: "テレビゲーム総合" };
}

function detectGameType(name = "") {
  const text = toComparableText(name);

  if (/(本体|console|同梱版|ディスクドライブ|digital edition)/.test(text)) {
    return { itemTypeKey: "hardware", itemTypeLabel: "本体・セット" };
  }

  if (
    /(コントローラー|joy-con|joycon|dualsense|dualshock|プロコン|周辺機器|ケース|保護|フィルム|充電|スタンド|ケーブル|カバー|収納|ヘッドセット|micro.?sd|メモリーカード)/.test(text)
  ) {
    return { itemTypeKey: "accessory", itemTypeLabel: "周辺機器" };
  }

  if (/(ソフト|ゲーム|版|特典|予約|パッケージ|ダウンロード)/.test(text)) {
    return { itemTypeKey: "software", itemTypeLabel: "ゲームソフト" };
  }

  return { itemTypeKey: "other", itemTypeLabel: "その他" };
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
              : detectGamePlatform(item.itemName)),
            ...detectGameType(item.itemName)
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
