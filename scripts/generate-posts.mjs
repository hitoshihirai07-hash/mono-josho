import fs from "node:fs/promises";

const ranking = JSON.parse(await fs.readFile(new URL("../src/data/ranking.json", import.meta.url), "utf8"));
const candidates = ranking.items
  .filter((item) => item.isNew || item.delta > 0)
  .sort((a, b) => (b.delta - a.delta) || (a.rank - b.rank))
  .slice(0, 3)
  .map((item, index) => {
    const platformLine = item.platformLabel ? `機種：${item.platformLabel}${item.itemTypeLabel ? ` / ${item.itemTypeLabel}` : ""}\n` : "";

    return {
      slot: ["08:00", "13:00", "20:00"][index],
      text: `${item.isNew ? "【新登場】" : "【ランキング急上昇】"}\n${item.name}\n${platformLine}${item.isNew ? `現在${item.rank}位` : `${item.previousRank}位 → ${item.rank}位（${item.delta}ランク上昇）`}\n価格：¥${item.price.toLocaleString()}\n${item.affiliateUrl}\n\n※広告`,
      itemCode: item.code
    };
  });

await fs.writeFile(new URL("../src/data/posts.json", import.meta.url), JSON.stringify(candidates, null, 2) + "\n");
console.log(`Generated ${candidates.length} X post drafts.`);
