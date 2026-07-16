const SERIES = ["rising", "price-drop", "evergreen"];

const ACCESSORY_PATTERNS = [
  ["controller", "コントローラー", /(コントローラ|ゲームパッド|joy-?con|dualsense|dualshock)/i],
  ["charger", "充電器", /(充電|チャージ|バッテリー|acアダプタ|電源)/i],
  ["case", "収納・ケース", /(ケース|収納|ポーチ|バッグ|スタンド|ホルダー)/i],
  ["headset", "ヘッドセット", /(ヘッドセット|ヘッドホン|イヤホン|マイク)/i],
  ["protector", "保護フィルム", /(保護フィルム|ガラスフィルム|液晶保護|保護シート)/i],
  ["desk", "デスク周辺", /(ゲーミングデスク|ゲーミングチェア|モニターアーム|キーボード|マウス)/i]
];

export const accessoryKind = (name = "") => {
  const found = ACCESSORY_PATTERNS.find(([, , pattern]) => pattern.test(name));
  return found ? { key: found[0], label: found[1] } : { key: "other", label: "その他の周辺機器" };
};

export const supportedPlatform = (name = "") => {
  if (/switch\s*2|ニンテンドー\s*スイッチ\s*2/i.test(name)) return "Nintendo Switch 2";
  if (/switch|スイッチ|joy-?con/i.test(name)) return "Nintendo Switch";
  if (/ps\s*5|playstation\s*5|dualsense/i.test(name)) return "PlayStation 5";
  if (/ps\s*4|playstation\s*4|dualshock/i.test(name)) return "PlayStation 4";
  if (/xbox/i.test(name)) return "Xbox";
  if (/pc|windows|ゲーミング/i.test(name)) return "PCほか（商品ページで要確認）";
  return "商品ページで要確認";
};

const isAccessory = (item) => item?.sourceKey === "game-accessories" || item?.gameType === "accessory";

const value = (item, key) => Number(item?.[key] || 0);
const looksLikeConsoleBundle = (name = "") => /(本体|すぐ遊べるセット|500GB|1TB|中古.*プレイステーション|プレイステーション.*中古)/i.test(name);
const eligible = (item) => isAccessory(item) && !looksLikeConsoleBundle(item?.name) && value(item, "price") > 0;

const reasonFor = (item, series) => {
  if (series === "rising") {
    return item.weekIsNew
      ? `楽天ランキング${item.rank}位に7日以内で新登場`
      : `7日前の${item.weekPreviousRank}位から${item.rank}位へ、${value(item, "weekDelta")}ランク上昇`;
  }
  if (series === "price-drop") {
    return `7日前より${Math.abs(value(item, "weekPriceChange")).toLocaleString("ja-JP")}円値下がり`;
  }
  return `レビュー${value(item, "reviewCount").toLocaleString("ja-JP")}件・評価${item.reviewAverage || "-"}`;
};

const scoreFor = (item, series) => {
  if (series === "rising") return (item.weekIsNew ? 80 : value(item, "weekDelta") * 10) - value(item, "rank");
  if (series === "price-drop") return Math.abs(value(item, "weekPriceChange")) + Math.min(value(item, "reviewCount"), 500);
  return value(item, "reviewCount") * 5 + value(item, "reviewAverage") * 100 - value(item, "rank");
};

const matchesSeries = (item, series) => {
  if (!eligible(item)) return false;
  if (series === "rising") return Boolean(item.weekComparisonReady) && (item.weekIsNew || value(item, "weekDelta") > 0);
  if (series === "price-drop") return Boolean(item.weekComparisonReady) && value(item, "weekPriceChange") < 0;
  return value(item, "reviewCount") >= 10 && value(item, "reviewAverage") >= 3.5;
};

export function selectAccessoryCandidates(ranking, limitPerSeries = 5) {
  const items = Array.isArray(ranking?.items) ? ranking.items : [];
  return SERIES.flatMap((series) => items
    .filter((item) => matchesSeries(item, series))
    .sort((a, b) => scoreFor(b, series) - scoreFor(a, series))
    .slice(0, limitPerSeries)
    .map((item) => ({
      ...item,
      series,
      kind: accessoryKind(item.name),
      platform: supportedPlatform(item.name),
      selectionReason: reasonFor(item, series)
    })));
}

export function selectWeeklyAccessoryPicks(ranking) {
  const candidates = selectAccessoryCandidates(ranking, 8);
  const used = new Set();
  return SERIES.flatMap((series) => {
    const match = candidates.find((item) => item.series === series && !used.has(item.code));
    if (!match) return [];
    used.add(match.code);
    return [match];
  });
}

export function roomComment(candidate) {
  return `【${candidate.kind.label}】${candidate.selectionReason}。対応機種：${candidate.platform}。価格・在庫・対応条件は楽天市場の商品ページでご確認ください。 #ゲーム周辺機器`;
}

export function xPost(candidate, siteUrl) {
  return `ゲーム周辺品の動きを確認\n${candidate.name}\n${candidate.selectionReason}\n対応機種：${candidate.platform}\n\n${siteUrl}\n#楽天市場 #ゲーム周辺機器 #PR`;
}
