const PLATFORM_SOURCES = new Set(["switch", "ps5", "ps4"]);

export const X_POST_WINDOWS = [
  { key: "day", label: "24時間" },
  { key: "latest", label: "前回取得" },
  { key: "week", label: "7日間" }
];

export const X_POST_SOURCES = [
  { key: "games", label: "ゲーム全体" },
  { key: "switch", label: "Switch" },
  { key: "ps5", label: "PS5" },
  { key: "ps4", label: "PS4" },
  { key: "stationery", label: "文具" },
  { key: "all", label: "全カテゴリ" }
];

export const X_POST_KINDS = [
  { key: "auto", label: "変化が大きい順" },
  { key: "rising", label: "順位上昇" },
  { key: "new", label: "新登場" },
  { key: "price-drop", label: "値下がり" }
];

const SOURCE_LABELS = {
  games: "ゲーム",
  switch: "Switch",
  ps5: "PS5",
  ps4: "PS4",
  stationery: "文具",
  all: "楽天"
};

const SOURCE_PATHS = {
  games: "/games/",
  switch: "/games/switch/",
  ps5: "/games/playstation/#ps5-ranking",
  ps4: "/games/playstation/#ps4-ranking",
  stationery: "/categories/stationery/",
  all: "/"
};

const SOURCE_HASHTAGS = {
  games: "#ゲームランキング",
  switch: "#NintendoSwitch",
  ps5: "#PS5",
  ps4: "#PS4",
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

const filterBySource = (item, sourceKey) => {
  if (sourceKey === "all") {
    return PLATFORM_SOURCES.has(item.sourceKey) || item.categoryKey === "stationery";
  }
  if (sourceKey === "games") return PLATFORM_SOURCES.has(item.sourceKey);
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

const changeScore = (item, values) =>
  (values.isNew ? Math.max(0, 40 - Number(item.rank || 40)) : 0) +
  Math.max(0, values.delta) * 10 +
  Math.max(0, -values.priceChange) / 100;

const sourcePrefix = (item, sourceKey) => {
  if (!["games", "all"].includes(sourceKey)) return "";
  const name = String(item.name || "").toLowerCase();
  if (item.sourceKey === "switch" && /(switch|スイッチ)/.test(name)) return "";
  if (item.sourceKey === "ps5" && /ps\s*5/.test(name)) return "";
  if (item.sourceKey === "ps4" && /ps\s*4/.test(name)) return "";
  if (item.sourceKey === "switch") return "Switch ";
  if (item.sourceKey === "ps5") return "PS5 ";
  if (item.sourceKey === "ps4") return "PS4 ";
  if (item.categoryKey === "stationery") return "文具 ";
  return "";
};

const formatLine = (item, values, kind, sourceKey) => {
  const name = truncateWeighted(item.name || "商品名未取得", 30);
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
  const period = X_POST_WINDOWS.find((window) => window.key === windowKey)?.label || "24時間";
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
  const games = candidates.filter(({ item }) => item.categoryKey === "games");
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
    "※順位変動は品質・買い時を保証しません。"
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
  const seen = new Set();
  const items = Array.isArray(ranking.items) ? ranking.items : [];
  const candidates = items
    .filter((item) => filterBySource(item, sourceKey))
    .map((item) => ({ item, values: comparisonValues(item, windowKey) }))
    .filter(({ item, values }) => {
      const key = itemKey(item);
      if (seen.has(key) || !filterByKind(values, kind)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      changeScore(b.item, b.values) - changeScore(a.item, a.values) ||
      Number(a.item.rank || 9999) - Number(b.item.rank || 9999)
    );

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
    items: selected.map(({ item, values }) => ({
      code: itemKey(item),
      name: item.name,
      sourceKey: item.sourceKey,
      rank: item.rank,
      previousRank: values.previousRank,
      delta: values.delta,
      isNew: values.isNew,
      priceChange: values.priceChange
    }))
  };
}
