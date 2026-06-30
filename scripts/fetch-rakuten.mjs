import fs from "node:fs/promises";

const appId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const siteUrl = process.env.SITE_URL || "https://mono-josho.pages.dev/";
const genres = [
  {
    id: process.env.RAKUTEN_GENRE_ID || "100901",
    key: "stationery",
    label: "文房具・事務用品"
  },
  {
    id: process.env.RAKUTEN_GAME_GENRE_ID || "101205",
    key: "games",
    label: "テレビゲーム"
  }
];

const toComparableText = (value = "") =>
  value.toString().toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

function detectGamePlatform(name = "") {
  const text = toComparableText(name);

  if (/(nintendo switch|switch|スイッチ|任天堂|joy-con|joycon|プロコン)/.test(text)) {
    return { platformKey: "switch", platformLabel: "Nintendo Switch" };
  }

  if (/(playstation|プレイステーション|プレステ|ps5|ps 5|ps4|ps 4|dualshock|dualsense)/.test(text)) {
    return { platformKey: "playstation", platformLabel: "PlayStation" };
  }

  return { platformKey: "other", platformLabel: "その他ゲーム" };
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
let previous = { items: [] };
try { previous = JSON.parse(await fs.readFile(previousPath, "utf8")); } catch {}
const previousRanks = new Map(previous.items.map((item) => [item.code, item.rank]));

async function fetchGenre(genre) {
  const url = new URL("https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601");
  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("genreId", genre.id);
  url.searchParams.set("period", "realtime");
  url.searchParams.set("formatVersion", "2");
  if (affiliateId) url.searchParams.set("affiliateId", affiliateId);

  const response = await fetch(url, {
    headers: {
      Referer: siteUrl,
      Origin: new URL(siteUrl).origin
    },
    referrer: siteUrl,
    referrerPolicy: "no-referrer-when-downgrade"
  });
  if (!response.ok) {
    throw new Error(`Rakuten API failed for ${genre.label}: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const sourceItems = payload.Items || payload.items || [];
  return sourceItems
    .map((raw) => raw.Item || raw)
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .slice(0, 30)
    .map((item) => {
      const oldRank = previousRanks.get(item.itemCode);
      const gameMeta = genre.key === "games"
        ? { ...detectGamePlatform(item.itemName), ...detectGameType(item.itemName) }
        : {};

      return {
        code: item.itemCode,
        rank: Number(item.rank),
        previousRank: oldRank || null,
        delta: oldRank ? oldRank - Number(item.rank) : 0,
        isNew: !oldRank,
        name: item.itemName,
        price: Number(item.itemPrice),
        image: item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || "",
        reviewAverage: item.reviewAverage || null,
        reviewCount: Number(item.reviewCount || 0),
        category: genre.label,
        categoryKey: genre.key,
        ...gameMeta,
        url: item.itemUrl,
        affiliateUrl: item.affiliateUrl || item.itemUrl,
        shopName: item.shopName || "楽天市場",
        fetchedAt: new Date().toISOString()
      };
    });
}

const items = (await Promise.all(genres.map(fetchGenre))).flat();

await fs.writeFile(previousPath, JSON.stringify({
  updatedAt: new Date().toISOString(),
  status: "ready",
  items
}, null, 2) + "\n");
console.log(`Saved ${items.length} Rakuten ranking items across ${genres.length} genres.`);
