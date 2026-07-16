const GAME_SOURCES = new Set(["games-overall", "switch", "ps5", "ps4"]);

export const X_POST_WINDOWS = [
  { key: "day", label: "24時間" },
  { key: "latest", label: "前回取得" },
  { key: "week", label: "7日間" }
];

export const X_POST_SOURCES = [
  { key: "games", label: "ゲーム全体（総合・Switch・PS5・PS4）" },
  { key: "games-overall", label: "テレビゲーム総合" },
  { key: "switch", label: "Switch" },
  { key: "ps5", label: "PS5" },
  { key: "ps4", label: "PS4" },
  { key: "card-games", label: "カードゲーム" },
  { key: "stationery", label: "文具" },
  { key: "all", label: "全カテゴリ" }
];

export const X_POST_KINDS = [
  { key: "auto", label: "変化が大きい順（おすすめ）" },
  { key: "rising", label: "順位上昇" },
  { key: "new", label: "新登場" },
  { key: "price-drop", label: "値下がり" }
];

const SOURCE_LABELS = {
  games: "ゲーム",
  "games-overall": "ゲーム総合",
  switch: "Switch",
  ps5: "PS5",
  ps4: "PS4",
  "card-games": "カードゲーム",
  stationery: "文具",
  all: "楽天"
};

const SOURCE_PATHS = {
  games: "/games/",
  "games-overall": "/games/",
  switch: "/games/switch/",
  ps5: "/games/playstation/#ps5-ranking",
  ps4: "/games/playstation/#ps4-ranking",
  "card-games": "/categories/card-games/",
  stationery: "/categories/stationery/",
  all: "/"
};

const SOURCE_HASHTAGS = {
  games: "#ゲームランキング",
  "games-overall": "#ゲームランキング",
  switch: "#NintendoSwitch",
  ps5: "#PS5",
  ps4: "#PS4",
  "card-games": "#カードゲーム",
  stationery: "#文具",
  all: "#楽天ランキング"
};

const isSingleWeightCodePoint = (codePoint) =>
  codePoint <= 0x10ff ||
  (codePoint >= 0x2000 && codePoint <= 0x200d) ||
  (codePoint >= 0x2010 && codePoint <= 0x201f) ||
  (codePoint >= 0x2032 && codePoint <= 0x2037);

const plainWeightedLength = (text = "") =>
  [...String(text)].reduce(
    (total, character) => total + (isSingleWeightCodePoint(character.codePointAt(0)) ? 1 : 2),
    0
  );

export function weightedXLength(text = "") {
  const value = String(text);
  const urlPattern = /https?:\/\/[^\s]+/gi;
  let length = 0;
  let cursor = 0;
  for (const match of value.matchAll(urlPattern)) {
    length += plainWeightedLength(value.slice(cursor, match.index));
    length += 23;
    cursor = Number(match.index) + match[0].length;
  }
  return length + plainWeightedLength(value.slice(cursor));
}

const truncateWeighted = (text = "", maxWeight = 36) => {
  if (weightedXLength(text) <= maxWeight) return text;
  let output = "";
  for (const character of String(text)) {
    if (weightedXLength(`${output}${character}…`) > maxWeight) break;
    output += character;
  }
  return `${output}…`;
};

/**
 * 楽天の商品名に含まれやすい販促・型番の前後を外し、投稿で読める長さに整える。
 * 商品名を完全に置換せず、意味が失われそうな場合は元の文字列を使う。
 */
export const formatPostProductName = (value = "", maxWeight = 42) => {
  const original = String(value).replace(/\s+/g, " ").trim();
  if (!original) return "商品名未取得";

  let cleaned = original
    .replace(/[（(][^()（）]{0,120}(?:特典|プロダクトコード|DLC|初回|早期|封入|予約)[^()（）]{0,120}[)）]/gi, " ")
    .replace(/【[^】]{1,120}】/g, " ")
    .replace(/[［\[][^］\]]{1,120}[］\]]/g, " ")
    .replace(/\s+(?:HAC|CFI|BEE|ELJM|PLJM|HAC-P|LA-H)[A-Z0-9-]{2,}\s*$/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length < 2) cleaned = original;
  return truncateWeighted(cleaned, maxWeight);
};

const formatNumber = (value) => Number(value || 0).toLocaleString("ja-JP");

const comparisonValues = (item, windowKey) => {
  if (windowKey === "day") {
    return {
      ready: Boolean(item.dayComparisonReady),
      previousRank: item.dayPreviousRank,
      delta: Number(item.dayDelta || 0),
      isNew: Boolean(item.dayIsNew),
      previousPrice: item.dayPreviousPrice,
      priceChange: Number(item.dayPriceChange || 0)
    };
  }
  if (windowKey === "week") {
    return {
      ready: Boolean(item.weekComparisonReady),
      previousRank: item.weekPreviousRank,
      delta: Number(item.weekDelta || 0),
      isNew: Boolean(item.weekIsNew),
      previousPrice: item.weekPreviousPrice,
      priceChange: Number(item.weekPriceChange || 0)
    };
  }
  return {
    ready: Boolean(item.previousComparisonReady ?? item.previousRank ?? item.isNew),
    previousRank: item.previousRank,
    delta: Number(item.delta || 0),
    isNew: Boolean(item.isNew),
    previousPrice: item.previousPrice,
    priceChange: Number(item.priceChange || 0)
  };
};

const itemKey = (item) => item.code || `${item.sourceKey || ""}:${item.name || ""}`;

const productIdentity = (item) =>
  formatPostProductName(item.name || "", 220)
    .toLocaleLowerCase("ja-JP")
    .replace(/(?:特典付き|特典|予約|限定版|初回版|ダウンロード版|パッケージ版)/g, "")
    .replace(/[\s\-・_/｜|:：]/g, "")
    .trim() || itemKey(item);

const filterBySource = (item, sourceKey) => {
  if (sourceKey === "all") {
    return GAME_SOURCES.has(item.sourceKey) || ["card-games", "stationery"].includes(item.categoryKey);
  }
  if (sourceKey === "games") return GAME_SOURCES.has(item.sourceKey) || item.categoryKey === "games";
  if (sourceKey === "card-games") return item.categoryKey === "card-games";
  if (sourceKey === "stationery") return item.categoryKey === "stationery";
  return item.sourceKey === sourceKey;
};

const filterByKind = (values, kind) => {
  if (!values.ready) return false;
  if (kind === "new") return values.isNew;
  if (kind === "rising") return !values.isNew && values.delta > 0;
  if (kind === "price-drop") return !values.isNew && values.priceChange < 0;
  return values.isNew || values.delta > 0 || values.priceChange < 0;
};

const changeScore = (item, values) => {
  const rank = Math.max(1, Number(item.rank || 999));
  const price = Math.max(0, Number(item.price || 0));
  const priceDrop = Math.max(0, -Number(values.priceChange || 0));
  const rankScore = Math.max(0, 31 - Math.min(rank, 31)) * 2;
  const risingScore = Math.min(30, Math.max(0, values.delta)) * 8;
  const newScore = values.isNew ? 58 + Math.max(0, 16 - rank) * 2 : 0;
  const priceScore = Math.min(28, priceDrop / 250);
  const priceRateScore = price > 0 && priceDrop / price >= 0.05 ? 12 : 0;
  // ゲーム中心のXでは、本体・周辺機器だけの変動よりゲームソフトを少し優先する。
  // 文具にはこの補正をかけないため、文具を選んだ場合の順位判断は変わらない。
  const typeAdjustment = item.categoryKey === "games"
    ? item.itemTypeKey === "software"
      ? 24
      : item.itemTypeKey === "hardware"
        ? -34
        : item.itemTypeKey === "accessory"
          ? -24
          : 0
    : 0;
  return rankScore + risingScore + newScore + priceScore + priceRateScore + typeAdjustment;
};

const sourcePrefix = (item, sourceKey) => {
  if (!['games', 'all'].includes(sourceKey)) return "";
  const name = String(item.name || "").toLowerCase();
  if (item.sourceKey === "switch" && /(switch|スイッチ)/.test(name)) return "";
  if (item.sourceKey === "ps5" && /ps\s*5/.test(name)) return "";
  if (item.sourceKey === "ps4" && /ps\s*4/.test(name)) return "";
  if (item.sourceKey === "games-overall") return "ゲーム総合 ";
  if (item.sourceKey === "switch") return "Switch ";
  if (item.sourceKey === "ps5") return "PS5 ";
  if (item.sourceKey === "ps4") return "PS4 ";
  if (item.categoryKey === "card-games") return "カード ";
  if (item.categoryKey === "stationery") return "文具 ";
  return "";
};

const sourceLabelForItem = (item) => {
  if (item.sourceKey === "games-overall") return "ゲーム総合";
  if (item.sourceKey === "switch") return "Switch";
  if (item.sourceKey === "ps5") return "PS5";
  if (item.sourceKey === "ps4") return "PS4";
  if (item.categoryKey === "card-games") return "カードゲーム";
  if (item.categoryKey === "stationery") return "文具";
  return item.sourceLabel || "楽天市場";
};

const periodLabel = (windowKey) =>
  X_POST_WINDOWS.find((window) => window.key === windowKey)?.label || "24時間";

const candidateReasons = (item, values, windowKey) => {
  const reasons = [];
  const rank = Number(item.rank || 0);
  const period = periodLabel(windowKey);
  if (values.isNew) reasons.push(`${rank}位に新登場`);
  if (!values.isNew && values.delta > 0) {
    reasons.push(`${period}で${values.previousRank}位→${rank}位（${values.delta}ランク上昇）`);
  }
  if (rank > 0 && rank <= 10) reasons.push(`現在${rank}位`);
  if (values.priceChange < 0) reasons.push(`前回より${formatNumber(Math.abs(values.priceChange))}円値下がり`);
  return reasons;
};

const candidateChangeType = (values) => {
  if (values.isNew) return "new";
  if (values.delta > 0 && values.priceChange < 0) return "rising-price-drop";
  if (values.delta > 0) return "rising";
  return "price-drop";
};

const toCandidate = ({ item, values, windowKey, score }) => ({
  code: itemKey(item),
  productIdentity: productIdentity(item),
  name: item.name,
  displayName: formatPostProductName(item.name, 50),
  sourceKey: item.sourceKey,
  sourceLabel: sourceLabelForItem(item),
  rank: Number(item.rank || 0),
  price: Number(item.price || 0),
  previousRank: values.previousRank,
  delta: values.delta,
  isNew: values.isNew,
  priceChange: values.priceChange,
  windowKey,
  score,
  changeType: candidateChangeType(values),
  reasons: candidateReasons(item, values, windowKey)
});

const collectCandidates = (ranking = {}, options = {}) => {
  const windowKey = X_POST_WINDOWS.some((window) => window.key === options.window)
    ? options.window
    : "day";
  const sourceKey = X_POST_SOURCES.some((source) => source.key === options.source)
    ? options.source
    : "games";
  const kind = X_POST_KINDS.some((candidate) => candidate.key === options.kind)
    ? options.kind
    : "auto";
  const excludedCodes = new Set(Array.isArray(options.excludeCodes) ? options.excludeCodes : []);
  const excludedProductIdentities = new Set(
    Array.isArray(options.excludeProductIdentities) ? options.excludeProductIdentities : []
  );
  const items = Array.isArray(ranking.items) ? ranking.items : [];
  const raw = items
    .filter((item) => filterBySource(item, sourceKey))
    .map((item) => ({ item, values: comparisonValues(item, windowKey) }))
    .filter(({ item, values }) =>
      !excludedCodes.has(itemKey(item)) &&
      !excludedProductIdentities.has(productIdentity(item)) &&
      filterByKind(values, kind)
    )
    .map(({ item, values }) => ({ item, values, score: changeScore(item, values) }))
    .sort((a, b) =>
      b.score - a.score ||
      Number(a.item.rank || 9999) - Number(b.item.rank || 9999)
    );

  const seenProducts = new Set();
  return raw.filter(({ item }) => {
    const identity = productIdentity(item);
    if (seenProducts.has(identity)) return false;
    seenProducts.add(identity);
    return true;
  });
};

/**
 * 投稿前に確認するための「今出す候補」。順位、上昇幅、値下がりを同じ基準で並べる。
 */
export function generateXPostCandidates(ranking = {}, options = {}) {
  const limit = Math.min(6, Math.max(1, Number(options.limit || 3)));
  const windowKey = X_POST_WINDOWS.some((window) => window.key === options.window)
    ? options.window
    : "day";
  const rows = collectCandidates(ranking, { ...options, window: windowKey, kind: "auto" });
  return {
    status: rows.length ? "ready" : "empty",
    availableCount: rows.length,
    items: rows.slice(0, limit).map((row) => toCandidate({ ...row, windowKey }))
  };
}

const formatLine = (item, values, kind, sourceKey) => {
  const name = formatPostProductName(item.name || "商品名未取得", 30);
  const prefix = sourcePrefix(item, sourceKey);
  if (values.isNew) return `・${prefix}${name}：${item.rank}位に新登場`;
  if (kind === "price-drop") {
    return `・${prefix}${name}：${formatNumber(Math.abs(values.priceChange))}円値下がり`;
  }
  if (kind === "rising") {
    return `・${prefix}${name}：${values.previousRank}位→${item.rank}位（${values.delta}↑）`;
  }
  if (values.delta > 0 && values.priceChange < 0) {
    return `・${prefix}${name}：${values.previousRank}位→${item.rank}位／${formatNumber(Math.abs(values.priceChange))}円値下げ`;
  }
  if (values.delta > 0) {
    return `・${prefix}${name}：${values.previousRank}位→${item.rank}位（${values.delta}↑）`;
  }
  return `・${prefix}${name}：${formatNumber(Math.abs(values.priceChange))}円値下がり`;
};

const headerLabel = (sourceKey, kind, windowKey) => {
  const source = SOURCE_LABELS[sourceKey] || SOURCE_LABELS.games;
  const period = periodLabel(windowKey);
  const kindLabel = kind === "rising"
    ? "順位上昇"
    : kind === "new"
      ? "新登場"
      : kind === "price-drop"
        ? "値下がり"
        : `${period}変動`;
  return `【${source}ランキング｜${kindLabel}】`;
};

const pageUrl = (siteUrl, sourceKey) =>
  new URL(SOURCE_PATHS[sourceKey] || "/", siteUrl).toString();

const prioritizeItems = (candidates, sourceKey, limit) => {
  if (sourceKey !== "all") return candidates.slice(0, limit);
  const games = candidates.filter(({ item }) => item.categoryKey === "games" || GAME_SOURCES.has(item.sourceKey));
  if (games.length < 2) return candidates.slice(0, limit);
  const selected = games.slice(0, Math.min(2, limit));
  const selectedKeys = new Set(selected.map(({ item }) => itemKey(item)));
  return [
    ...selected,
    ...candidates.filter(({ item }) => !selectedKeys.has(itemKey(item)))
  ].slice(0, limit);
};

const composePost = ({ sourceKey, kind, windowKey, rows, includeLink, includeHashtag, siteUrl }) => {
  const parts = [
    headerLabel(sourceKey, kind, windowKey),
    "",
    ...rows,
    "",
    "※楽天市場内のランキング変化です。"
  ];
  if (includeHashtag) parts.push(SOURCE_HASHTAGS[sourceKey] || SOURCE_HASHTAGS.games);
  if (includeLink) parts.push(pageUrl(siteUrl, sourceKey));
  return parts.join("\n");
};

export function generateXPost(ranking = {}, options = {}) {
  const windowKey = X_POST_WINDOWS.some((window) => window.key === options.window)
    ? options.window
    : "day";
  const sourceKey = X_POST_SOURCES.some((source) => source.key === options.source)
    ? options.source
    : "games";
  const kind = X_POST_KINDS.some((candidate) => candidate.key === options.kind)
    ? options.kind
    : "auto";
  const requestedLimit = Math.min(3, Math.max(1, Number(options.limit || 3)));
  const includeLink = Boolean(options.includeLink);
  const includeHashtag = Boolean(options.includeHashtag);
  const siteUrl = options.siteUrl || "https://mono-josho.pages.dev/";
  const candidates = collectCandidates(ranking, { window: windowKey, source: sourceKey, kind });

  let selected = prioritizeItems(candidates, sourceKey, requestedLimit);
  let text = "";
  while (selected.length > 0) {
    const rows = selected.map(({ item, values }) => formatLine(item, values, kind, sourceKey));
    text = composePost({
      sourceKey,
      kind,
      windowKey,
      rows,
      includeLink,
      includeHashtag,
      siteUrl
    });
    if (weightedXLength(text) <= 280 || selected.length === 1) break;
    selected = selected.slice(0, -1);
  }

  return {
    status: selected.length > 0 ? "ready" : "empty",
    text,
    weightedLength: weightedXLength(text),
    remaining: 280 - weightedXLength(text),
    selectedCount: selected.length,
    availableCount: candidates.length,
    items: selected.map(({ item, values, score }) => toCandidate({ item, values, windowKey, score }))
  };
}

/**
 * 一つの変化に絞って、Xのタイムラインで読みやすい短文を作る。
 */
export function generateSingleXPost(candidate, options = {}) {
  if (!candidate) {
    return { status: "empty", text: "", weightedLength: 0, remaining: 280 };
  }

  const name = formatPostProductName(candidate.displayName || candidate.name || "商品名未取得", 56);
  const source = candidate.sourceLabel || SOURCE_LABELS[candidate.sourceKey] || "楽天市場";
  const price = Number(candidate.price || 0);
  const priceDrop = Math.max(0, -Number(candidate.priceChange || 0));
  const currentRank = Number(candidate.rank || 0);
  const period = periodLabel(candidate.windowKey || "day");
  let text;

  if (candidate.isNew) {
    text = [
      "【今日の新登場】",
      `${source}で「${name}」が${currentRank}位に新登場。`,
      price > 0 ? `現在${formatNumber(price)}円。` : "",
      "※楽天市場内のランキング変化です。"
    ].filter(Boolean).join("\n");
  } else if (Number(candidate.delta || 0) > 0) {
    const priceSentence = priceDrop > 0
      ? `価格も前回より${formatNumber(priceDrop)}円下がり、現在${formatNumber(price)}円。`
      : price > 0
        ? `現在${formatNumber(price)}円。`
        : "";
    text = [
      "【今日のランキングの動き】",
      `${source}で「${name}」が${candidate.previousRank}位→${currentRank}位。`,
      `${candidate.delta}ランク上昇。${priceSentence}`,
      "※楽天市場内のランキング変化です。"
    ].filter(Boolean).join("\n");
  } else {
    text = [
      "【今日の値動き】",
      `${source}の「${name}」が${formatNumber(priceDrop)}円値下がり。`,
      price > 0 && currentRank > 0 ? `現在${formatNumber(price)}円、ランキングは${currentRank}位。` : "",
      "※楽天市場内のランキング変化です。"
    ].filter(Boolean).join("\n");
  }

  if (options.includeHashtag) {
    text += `\n${SOURCE_HASHTAGS[candidate.sourceKey] || SOURCE_HASHTAGS.games}`;
  }
  if (options.includeLink && options.siteUrl) {
    text += `\n${pageUrl(options.siteUrl, candidate.sourceKey || "games")}`;
  }

  return {
    status: "ready",
    text,
    weightedLength: weightedXLength(text),
    remaining: 280 - weightedXLength(text),
    items: [candidate]
  };
}
