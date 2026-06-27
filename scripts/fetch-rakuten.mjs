import fs from "node:fs/promises";

const appId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const genreId = process.env.RAKUTEN_GENRE_ID || "100901";

if (!appId || !accessKey) {
  console.log("Rakuten credentials are not configured; keeping preparing state.");
  process.exit(0);
}

const url = new URL("https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601");
url.searchParams.set("applicationId", appId);
url.searchParams.set("accessKey", accessKey);
url.searchParams.set("genreId", genreId);
url.searchParams.set("period", "realtime");
url.searchParams.set("formatVersion", "2");
if (affiliateId) url.searchParams.set("affiliateId", affiliateId);

const previousPath = new URL("../src/data/ranking.json", import.meta.url);
let previous = { items: [] };
try { previous = JSON.parse(await fs.readFile(previousPath, "utf8")); } catch {}
const previousRanks = new Map(previous.items.map((item) => [item.code, item.rank]));

const response = await fetch(url);
if (!response.ok) throw new Error(`Rakuten API failed: ${response.status} ${await response.text()}`);
const payload = await response.json();
const sourceItems = payload.Items || payload.items || [];
const items = sourceItems.slice(0, 30).map((raw) => {
  const item = raw.Item || raw;
  const oldRank = previousRanks.get(item.itemCode);
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
    category: payload.title || "文具・雑貨",
    url: item.itemUrl,
    affiliateUrl: item.affiliateUrl || item.itemUrl,
    shopName: item.shopName || "楽天市場",
    fetchedAt: new Date().toISOString()
  };
});

await fs.writeFile(previousPath, JSON.stringify({
  updatedAt: new Date().toISOString(),
  status: "ready",
  items
}, null, 2) + "\n");
console.log(`Saved ${items.length} Rakuten ranking items.`);
